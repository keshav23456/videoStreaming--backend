import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            throw new Error("❌ MONGODB_URI is not defined in .env file");
        }

        const connectionInstance = await mongoose.connect(mongoURI, {
            dbName: "myDatabase", // Set your DB name
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB connected! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("❌ MONGODB connection FAILED:", error);
        process.exit(1);
    }
};

export default connectDB;
