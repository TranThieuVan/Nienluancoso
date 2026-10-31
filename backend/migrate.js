
require("dotenv").config();
const { MongoClient } = require("mongodb");

const LOCAL_URI = process.env.MONGO_URI;
const ATLAS_URI = process.env.ATLAS_URI;

async function migrateDatabase() {
    const localClient = new MongoClient(LOCAL_URI);
    const atlasClient = new MongoClient(ATLAS_URI);

    try {
        console.log("Connecting to local MongoDB...");
        await localClient.connect();

        console.log("Connecting to MongoDB Atlas...");
        await atlasClient.connect();

        const localDB = localClient.db("booknest");
        const atlasDB = atlasClient.db("booknest");

        const collections = await localDB
            .listCollections({}, { nameOnly: true })
            .toArray();

        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;

            console.log(`Migrating: ${collectionName}`);

            const documents = await localDB
                .collection(collectionName)
                .find({})
                .toArray();

            if (documents.length === 0) {
                await atlasDB.createCollection(collectionName);
                console.log(`Created empty collection: ${collectionName}`);
                continue;
            }

            await atlasDB.collection(collectionName).insertMany(documents);

            console.log(`Copied ${documents.length} documents.`);
        }

        console.log("\nDatabase migration completed!");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await localClient.close();
        await atlasClient.close();
    }
}

migrateDatabase();
