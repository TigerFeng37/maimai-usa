import Locations from '../recent-locations.json';

function RecentsBanner() {
    return (
        <>
            <div className="flex flex-row items-center gap-2 p-4">
                <span className="text-sm text-gray-500">Recently Activated</span>
                <div>
                    {Locations.map((location) => (
                        <button key={location.code} className="text-sm text-gray-500">
                            {location.name}
                        </button>
                    ))}
                </div>
            </div>
        </>
    )
}

export default RecentsBanner;