import 'dotenv/config'
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFile, writeFile } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001'
const NOTIFICATION_FILE = join(__dirname, '../data/notifications.json')
const CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Initialize Discord client (read-only for sending messages)
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

// Load store data
let storeData = []
async function loadStoreData() {
  try {
    const storeDataPath = join(__dirname, '../../src/r1index-geocoded.json')
    const data = await readFile(storeDataPath, 'utf-8')
    storeData = JSON.parse(data)
    console.log(`✅ 已加载 ${storeData.length} 个商店数据`)
  } catch (error) {
    console.error('❌ 加载商店数据时出错:', error)
  }
}

// Find store by ID
function findStore(storeId) {
  return storeData.find(s => s.storeid === storeId)
}

// Load notification tracking data
async function loadNotifications() {
  try {
    const data = await readFile(NOTIFICATION_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { lastChecked: new Date().toISOString(), sentPosts: {} }
    }
    throw error
  }
}

// Save notification tracking data
async function saveNotifications(data) {
  const { mkdir } = await import('fs/promises')
  await mkdir(dirname(NOTIFICATION_FILE), { recursive: true })
  await writeFile(NOTIFICATION_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

// Get all users
async function getAllUsers() {
  try {
    const usersPath = join(__dirname, '../data/users.json')
    const data = await readFile(usersPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('加载用户数据时出错:', error)
    return {}
  }
}

// Get posts for a store
async function getStorePosts(storeId, since = null) {
  try {
    let url = `${API_BASE_URL}/api/forum/posts?storeId=${storeId}&limit=20`
    if (since) {
      // Filter posts created after the timestamp
      // Note: API doesn't support filtering by date, so we'll filter client-side
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const data = await response.json()
    return data.posts || []
  } catch (error) {
    console.error(`获取商店 ${storeId} 的帖子时出错:`, error)
    return []
  }
}

// Format time ago
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

// Send notification to user
async function sendNotification(discordUserId, store, post) {
  try {
    const user = await client.users.fetch(discordUserId)
    if (!user) {
      console.log(`⚠️ 找不到 Discord 用户: ${discordUserId}`)
      return false
    }

    const embed = new EmbedBuilder()
      .setColor(0x41BCCC)
      .setTitle('📢 你收藏的商店有新帖子！')
      .setDescription(`**${store.name}**\n📍 ${store.city}, ${store.state}`)
      .addFields(
        {
          name: post.type === 'report' ? '📋 问题报告' : '💬 新帖子',
          value: `**${post.title || 'Issue Report'}**\n${post.content ? post.content.substring(0, 200) + (post.content.length > 200 ? '...' : '') : ''}`,
          inline: false
        },
        {
          name: '👤 作者',
          value: post.username || 'Anonymous',
          inline: true
        },
        {
          name: '🕐 时间',
          value: formatTimeAgo(new Date(post.createdAt)),
          inline: true
        }
      )
      .setURL(`${process.env.FRONTEND_URL || 'https://maimaiusa.com'}/location/${store.storeid}`)
      .setFooter({ text: '点击查看完整信息' })
      .setTimestamp(new Date(post.createdAt))

    if (post.issues && post.issues.length > 0) {
      embed.addFields({
        name: '🏷️ 问题类型',
        value: post.issues.join(', '),
        inline: false
      })
    }

    if (post.resolved !== undefined) {
      embed.addFields({
        name: '✅ 状态',
        value: post.resolved ? '已解决' : '未解决',
        inline: true
      })
    }

    await user.send({ embeds: [embed] })
    console.log(`✅ 已发送通知给 ${user.tag} (${discordUserId}) - 商店: ${store.name}`)
    return true
  } catch (error) {
    if (error.code === 50007) {
      // User has DMs disabled
      console.log(`⚠️ 用户 ${discordUserId} 已禁用私信`)
    } else {
      console.error(`❌ 发送通知给 ${discordUserId} 时出错:`, error.message)
    }
    return false
  }
}

// Check for new posts and send notifications
async function checkAndNotify() {
  try {
    console.log('🔍 检查新的帖子...')
    
    const notifications = await loadNotifications()
    const users = await getAllUsers()
    const lastChecked = new Date(notifications.lastChecked || Date.now() - CHECK_INTERVAL)
    const sentPosts = notifications.sentPosts || {}
    const newSentPosts = { ...sentPosts }

    // Track all stores that need to be checked
    const storesToCheck = new Set()

    // Collect all favorite stores from all users
    Object.values(users).forEach(user => {
      if (user.favoriteStores && user.favoriteStores.length > 0) {
        user.favoriteStores.forEach(storeId => {
          storesToCheck.add(storeId)
        })
      }
    })

    console.log(`📊 检查 ${storesToCheck.size} 个被收藏的商店`)

    // Check each store for new posts
    for (const storeId of storesToCheck) {
      const store = findStore(storeId)
      if (!store) {
        console.log(`⚠️ 找不到商店: ${storeId}`)
        continue
      }

      const posts = await getStorePosts(storeId)
      const recentPosts = posts.filter(post => {
        const postDate = new Date(post.createdAt)
        return postDate > lastChecked && !sentPosts[post.id]
      })

      if (recentPosts.length > 0) {
        console.log(`📬 商店 ${store.name} 有 ${recentPosts.length} 个新帖子`)

        // Find all users who favorited this store
        const usersWithFavorite = Object.values(users).filter(user =>
          user.favoriteStores && user.favoriteStores.includes(storeId) && user.discordUserId
        )

        // Send notifications
        for (const post of recentPosts) {
          for (const user of usersWithFavorite) {
            // Don't notify the user if they created the post
            if (post.userId === user.id) {
              continue
            }

            await sendNotification(user.discordUserId, store, post)
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          newSentPosts[post.id] = true
        }
      }
    }

    // Clean up old sent posts (keep only last 1000)
    const sentPostIds = Object.keys(newSentPosts)
    if (sentPostIds.length > 1000) {
      const sortedIds = sentPostIds.sort((a, b) => {
        // Try to get timestamp from post ID if it's timestamp-based
        return b.localeCompare(a)
      })
      const idsToKeep = sortedIds.slice(0, 1000)
      Object.keys(newSentPosts).forEach(id => {
        if (!idsToKeep.includes(id)) {
          delete newSentPosts[id]
        }
      })
    }

    // Update last checked time
    await saveNotifications({
      lastChecked: new Date().toISOString(),
      sentPosts: newSentPosts
    })

    console.log(`✅ 检查完成 - ${new Date().toISOString()}`)
  } catch (error) {
    console.error('❌ 检查通知时出错:', error)
  }
}

// Bot ready event
client.once('ready', async () => {
  console.log(`✅ 通知服务已启动 - ${client.user.tag}`)
  await loadStoreData()

  // Initial check
  await checkAndNotify()

  // Schedule periodic checks
  setInterval(checkAndNotify, CHECK_INTERVAL)
  console.log(`⏰ 每 ${CHECK_INTERVAL / 1000 / 60} 分钟检查一次新帖子`)
})

// Error handling
client.on('error', error => {
  console.error('Discord client 错误:', error)
})

process.on('unhandledRejection', error => {
  console.error('未处理的 promise 拒绝:', error)
})

// Start notifier
if (!process.env.DISCORD_BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN 环境变量未设置')
  process.exit(1)
}

client.login(process.env.DISCORD_BOT_TOKEN)

