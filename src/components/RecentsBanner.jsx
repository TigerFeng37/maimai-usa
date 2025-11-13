import { useNavigate } from 'react-router-dom';
import Locations from '../recent-locations.json';
import data from '../r1index-geocoded.json';

function RecentsBanner() {
    const navigate = useNavigate();
    
    // Find storeid for each location by matching name
    const locationsWithStoreId = Locations.map(recentLoc => {
        const matchedLocation = data.find(loc => loc.name === recentLoc.name);
        return {
            ...recentLoc,
            storeid: matchedLocation?.storeid || null
        };
    }).filter(loc => loc.storeid); // Only show locations that have a storeid
    
    return (
        <>
            <div className="flex flex-col md:flex-row items-start gap-2 py-2 px-4 w-full">
                <span className="text-sm text-gray-500">Recently Activated</span>
                <div className="w-full md:w-fit flex flex-col md:flex-row items-start gap-1 md:gap-2 justify-start">
                    {locationsWithStoreId.map((location) => (
                        <a key={location.storeid} className="w-full md:w-fit text-sm font-medium text-black dark:text-white flex flex-row items-center gap-1 justify-between md:justify-start" onClick={() => navigate(`/location/${location.storeid}`)} href={`/location/${location.storeid}`}>
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