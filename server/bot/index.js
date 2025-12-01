import 'dotenv/config'
import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import fetch from 'node-fetch'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001'

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
})

// Load store data (for store lookup)
let storeData = []
async function loadStoreData() {
  try {
    const { fileURLToPath } = await import('url')
    const { dirname, join } = await import('path')
    const { readFile } = await import('fs/promises')
    
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const storeDataPath = join(__dirname, '../../src/r1index-geocoded.json')
    
    const data = await readFile(storeDataPath, 'utf-8')
    storeData = JSON.parse(data)
  } catch (error) {
    console.error('Error loading store data:', error)
  }
}

// Find store by ID or name
function findStore(query) {
  if (!query) return null
  
  // Try to find by storeId first
  let store = storeData.find(s => s.storeid === query)
  
  // If not found, try to find by name (case-insensitive partial match)
  if (!store) {
    const queryLower = query.toLowerCase()
    store = storeData.find(s => 
      s.name.toLowerCase().includes(queryLower) ||
      s.code?.toLowerCase() === queryLower ||
      s.city?.toLowerCase().includes(queryLower)
    )
  }
  
  return store
}

// API helper functions
async function getFavorites(discordUserId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/favorites/users/${discordUserId}`)
    if (response.status === 404) {
      return { favoriteStores: [] }
    }
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return { favoriteStores: [] }
  }
}

async function addFavorite(discordUserId, storeId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/favorites/users/${discordUserId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `API error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    throw error
  }
}

async function removeFavorite(discordUserId, storeId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/favorites/users/${discordUserId}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    throw error
  }
}

async function getStorePosts(storeId, limit = 5) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/forum/posts?storeId=${storeId}&limit=${limit}`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const data = await response.json()
    return data.posts || []
  } catch (error) {
    console.error('Error fetching store posts:', error)
    return []
  }
}

// Register slash commands
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('favorite')
      .setDescription('收藏一个商店，接收该商店的论坛更新通知')
      .addStringOption(option =>
        option.setName('store')
          .setDescription('商店ID或商店名称')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('unfavorite')
      .setDescription('取消收藏一个商店')
      .addStringOption(option =>
        option.setName('store')
          .setDescription('商店ID或商店名称')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('favorites')
      .setDescription('查看你收藏的商店列表'),
    new SlashCommandBuilder()
      .setName('store')
      .setDescription('查看商店信息和最近的帖子')
      .addStringOption(option =>
        option.setName('store')
          .setDescription('商店ID或商店名称')
          .setRequired(true)
      )
  ].map(command => command.toJSON())

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN)

  try {
    console.log('开始注册斜杠命令...')

    // For guild commands (faster, for testing)
    if (process.env.DISCORD_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
        { body: commands }
      )
      console.log('成功注册公会斜杠命令')
    }

    // For global commands (takes up to 1 hour to propagate)
    if (process.env.DISCORD_REGISTER_GLOBAL === 'true') {
      await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
        { body: commands }
      )
      console.log('成功注册全局斜杠命令')
    }
  } catch (error) {
    console.error('注册命令时出错:', error)
  }
}

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return

  const { commandName, user, options } = interaction
  const discordUserId = user.id

  try {
    if (commandName === 'favorite') {
      await interaction.deferReply()

      const storeQuery = options.getString('store')
      const store = findStore(storeQuery)

      if (!store) {
        await interaction.editReply({
          content: `❌ 找不到商店 "${storeQuery}"。请使用商店ID或商店名称。`
        })
        return
      }

      try {
        await addFavorite(discordUserId, store.storeid)
        
        const embed = new EmbedBuilder()
          .setColor(0x41BCCC)
          .setTitle('✅ 商店已添加到收藏')
          .setDescription(`**${store.name}**`)
          .addFields(
            { name: '📍 位置', value: `${store.city}, ${store.state}`, inline: true },
            { name: '🕹️ 机台数量', value: `${store.cab_count}`, inline: true },
            { name: '🆔 商店ID', value: store.storeid, inline: false }
          )
          .setFooter({ text: '当该商店有新帖子时，你会收到通知' })

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        if (error.message.includes('already in favorites')) {
          await interaction.editReply({
            content: `✅ "${store.name}" 已经在你的收藏列表中了！`
          })
        } else if (error.message.includes('User not found')) {
          await interaction.editReply({
            content: `❌ 未找到你的账户。请先在网站 (${process.env.FRONTEND_URL || 'https://maimai-usa.pages.dev'}) 上使用 Discord 登录一次。`
          })
        } else {
          throw error
        }
      }
    }

    else if (commandName === 'unfavorite') {
      await interaction.deferReply()

      const storeQuery = options.getString('store')
      const store = findStore(storeQuery)

      if (!store) {
        await interaction.editReply({
          content: `❌ 找不到商店 "${storeQuery}"。请使用商店ID或商店名称。`
        })
        return
      }

      try {
        await removeFavorite(discordUserId, store.storeid)
        
        const embed = new EmbedBuilder()
          .setColor(0xFF6B6B)
          .setTitle('🗑️ 商店已从收藏中移除')
          .setDescription(`**${store.name}**`)
          .setFooter({ text: '你将不再收到该商店的更新通知' })

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        console.error('Error removing favorite:', error)
        await interaction.editReply({
          content: `❌ 移除收藏时出错: ${error.message}`
        })
      }
    }

    else if (commandName === 'favorites') {
      await interaction.deferReply()

      const { favoriteStores } = await getFavorites(discordUserId)

      if (favoriteStores.length === 0) {
        await interaction.editReply({
          content: '📋 你还没有收藏任何商店。使用 `/favorite <商店>` 来添加收藏。'
        })
        return
      }

      const stores = favoriteStores
        .map(id => findStore(id))
        .filter(Boolean)

      if (stores.length === 0) {
        await interaction.editReply({
          content: '📋 你的收藏列表为空或包含无效的商店ID。'
        })
        return
      }

      const embed = new EmbedBuilder()
        .setColor(0x41BCCC)
        .setTitle('⭐ 你收藏的商店')
        .setDescription(stores.map((store, index) => 
          `**${index + 1}.** ${store.name}\n   📍 ${store.city}, ${store.state} | 🆔 ${store.storeid}`
        ).join('\n\n'))
        .setFooter({ text: `共 ${stores.length} 个商店` })

      await interaction.editReply({ embeds: [embed] })
    }

    else if (commandName === 'store') {
      await interaction.deferReply()

      const storeQuery = options.getString('store')
      const store = findStore(storeQuery)

      if (!store) {
        await interaction.editReply({
          content: `❌ 找不到商店 "${storeQuery}"。请使用商店ID或商店名称。`
        })
        return
      }

      // Get recent posts
      const posts = await getStorePosts(store.storeid, 3)

      const embed = new EmbedBuilder()
        .setColor(0x41BCCC)
        .setTitle(store.name)
        .setDescription(`📍 ${store.city}, ${store.state}`)
        .addFields(
          { name: '🕹️ 机台数量', value: `${store.cab_count}`, inline: true },
          { name: '🆔 商店ID', value: store.storeid, inline: true },
          { name: '📊 状态', value: store.active ? '✅ 营业中' : '⏳ 即将开业', inline: true }
        )

      if (store.address) {
        embed.addFields({ name: '📍 地址', value: store.address, inline: false })
      }

      if (posts.length > 0) {
        const postsText = posts.slice(0, 3).map(post => {
          const date = new Date(post.createdAt)
          const timeAgo = formatTimeAgo(date)
          const type = post.type === 'report' ? '📋 报告' : '💬 帖子'
          return `**${type}** - ${post.title || 'Issue Report'}\n   👤 ${post.username} · ${timeAgo}`
        }).join('\n\n')
        
        embed.addFields({ name: '📝 最近的帖子', value: postsText || '暂无', inline: false })
      } else {
        embed.addFields({ name: '📝 最近的帖子', value: '暂无帖子', inline: false })
      }

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('查看网站')
            .setURL(`${process.env.FRONTEND_URL || 'https://maimai-usa.pages.dev'}/location/${store.storeid}`)
            .setStyle(ButtonStyle.Link)
        )

      await interaction.editReply({ embeds: [embed], components: [row] })
    }
  } catch (error) {
    console.error('处理命令时出错:', error)
    const content = interaction.deferred 
      ? { content: `❌ 处理命令时出错: ${error.message}` }
      : { content: `❌ 处理命令时出错: ${error.message}`, ephemeral: true }
    
    try {
      if (interaction.deferred) {
        await interaction.editReply(content)
      } else {
        await interaction.reply(content)
      }
    } catch (replyError) {
      console.error('回复错误时出错:', replyError)
    }
  }
})

// Helper function to format time ago
function formatTimeAgo(date) {
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Bot ready event
client.once('ready', async () => {
  console.log(`✅ Discord bot 已登录为 ${client.user.tag}`)
  await loadStoreData()
  console.log(`✅ 已加载 ${storeData.length} 个商店数据`)
  await registerCommands()
})

// Error handling
client.on('error', error => {
  console.error('Discord client 错误:', error)
})

process.on('unhandledRejection', error => {
  console.error('未处理的 promise 拒绝:', error)
})

// Start bot
if (!process.env.DISCORD_BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN 环境变量未设置')
  process.exit(1)
}

client.login(process.env.DISCORD_BOT_TOKEN)

