import Locations from '../recent-locations.json';

function RecentsBanner() {
    return (
        <>
            <div className="flex flex-row items-center gap-2 p-4">
                <span className="text-sm text-gray-500">Recently Activated</span>
                <div className="flex flex-row items-center gap-2">
                    {Locations.map((location) => (
                        <button key={location.code} className="text-sm font-medium text-black dark:text-white">
                            {location.name}
                        </button>
                    ))}
                </div>
            </div>
        </>
    )
}

export default RecentsBanner;