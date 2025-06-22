import { redis } from "./redis";
export const invalidateRideCache = async (from:String,to:String,date:String) => {
    try {
       
        const pattern = `ride${from}${to}${date}*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(keys);
        }
        console.log(`Cache invalidated for key: ${pattern}`);
    } catch (error) {
        console.error(`Error invalidating cache for key`, error);
    }
}