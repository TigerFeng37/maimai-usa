import Locations from '../recent-locations.json';

function RecentsBanner() {
    return (
        <>
            <div className="flex flex-col md:flex-row items-start gap-2 py-2 px-4 w-full">
                <span className="text-sm text-gray-500">Recently Activated</span>
                <div className="w-full md:w-fit flex flex-col md:flex-row items-start gap-1 md:gap-2 justify-start">
                    {Locations.map((location) => (
                        <a key={location.code} className="w-full md:w-fit text-sm font-medium text-black dark:text-white flex flex-row items-center gap-1 justify-between md:justify-start" onClick={() => navigate(`/location/${location.code}`)} href={`/location/${location.code}`}>
                            {location.name}
                            <span className="text-sm text-gray-500 md:hidden">→</span>
                        </a>
                    ))}
                </div>
            </div>
        </>
    )
}

export default RecentsBanner;