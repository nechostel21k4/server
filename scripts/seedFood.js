const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const FoodItem = require('../models/FoodItem');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const foodItems = [
    // BREAKFAST
    { name: 'Idli with Sambar & Ginger Chutney', category: 'breakfast' },
    { name: 'Pesarattu with Upma', category: 'breakfast' },
    { name: 'Puri with Potato Kurma', category: 'breakfast' },
    { name: 'Masala Dosa with Chutney', category: 'breakfast' },
    { name: 'Mysore Bajji (Goli Bajji)', category: 'breakfast' },
    { name: 'Vada with Allam Chutney', category: 'breakfast' },
    { name: 'Tomato Bath (Upma)', category: 'breakfast' },

    // LUNCH
    { name: 'Andhra Veg Meals (Pappu, Charu, Fry)', category: 'lunch' },
    { name: 'Hyderabadi Chicken Biryani', category: 'lunch' },
    { name: 'Egg Pulao', category: 'lunch' },
    { name: 'Tomato Dal with Rice & Gondura Pickle', category: 'lunch' },
    { name: 'Majjiga Pulusu with Rice', category: 'lunch' },
    { name: 'Lemon Rice with Curd', category: 'lunch' },
    { name: 'Bagara Rice with Dalacha', category: 'lunch' },

    // SNACKS
    { name: 'Punugulu with Spicy Chutney', category: 'snacks' },
    { name: 'Mirchi Bajji', category: 'snacks' },
    { name: 'Onion Pakoda', category: 'snacks' },
    { name: 'Masala Samosa', category: 'snacks' },
    { name: 'Sweet Corn', category: 'snacks' },
    { name: 'Tea & Biscuits', category: 'snacks' },
    { name: 'Filter Coffee', category: 'snacks' },

    // DINNER
    { name: 'Chapathi with Mixed Veg Curry', category: 'dinner' },
    { name: 'Egg Masala with Rice', category: 'dinner' },
    { name: 'Rasam with Rice & Fry', category: 'dinner' },
    { name: 'Pulihora with Curd Rice', category: 'dinner' },
    { name: 'Veg Pulao with Raitha', category: 'dinner' },
    { name: 'Coconut Rice', category: 'dinner' },
    { name: 'Ulavacharu with Rice', category: 'dinner' }
];

const seedDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected!');

        // Clear existing items if any (Optional - keeping it for a clean seed)
        // await FoodItem.deleteMany({});
        // console.log('Cleared existing food items.');

        console.log('Seeding Andhra Food Menu...');
        
        for (const item of foodItems) {
            try {
                await FoodItem.create(item);
                console.log(`Added: ${item.name} (${item.category})`);
            } catch (err) {
                if (err.code === 11000) {
                    console.log(`Skipped: ${item.name} (Already exists)`);
                } else {
                    console.error(`Error adding ${item.name}:`, err.message);
                }
            }
        }

        console.log('Seeding completed successfully!');
        process.exit();
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDB();
