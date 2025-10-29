
// --- DATABASE SEEDING SCRIPT ---
// This script ensures that the Firestore database has the necessary course data.
// It checks if the 'courses' collection is empty and, if so, populates it.

// This function will be called from the main application script.
export async function seedDatabase(db) {
    if (!db) {
        console.error("Firestore database instance is not provided. Seeding cannot proceed.");
        return;
    }

    const coursesCollection = db.collection("courses");
    try {
        const snapshot = await coursesCollection.get();
        if (snapshot.empty) {
            console.log("Course collection is empty. Seeding database...");
            await addInitialCourses(db);
        } else {
            console.log("Course collection already has data. No seeding needed.");
        }
    } catch (error) {
        console.error("Error checking course collection:", error);
    }
}

// --- INITIAL COURSE DATA ---
// This array holds the default data for all courses.
// The IDs are simplified to be URL-friendly (e.g., 'broiler-rearing').
const initialCourses = [
    {
        id: 'broiler-rearing',
        title: 'Broiler Chicken Rearing',
        subtitle: 'Master the 7-week profit cycle with secrets to maximizing profitability.',
        image: 'images/broiler-card.png',
        price: '9.99',
        description: 'We teach you how to finish a flock in just 7 weeks, showing you the secrets to maximizing profitability, managing feed costs, and keeping your birds safe and healthy.',
        notes: [
            { title: 'Week 1-2: Brooding Fundamentals', content: 'Detailed notes on temperature control, chick placement, and early nutrition strategies to ensure a strong start.' },
            { title: 'Week 3-4: Growth Optimization', content: 'Learn about feed conversion ratios, growth monitoring, and adjusting feed for optimal weight gain.' },
            { title: 'Week 5-6: Health Management', content: 'Focus on biosecurity, common disease prevention, and creating a stress-free environment for your flock.' },
            { title: 'Week 7: Market Preparation', content: 'Strategies for final feeding, processing, and understanding market demands to get the best price.' }
        ],
        videos: [
            { title: 'Setting Up Your Brooder', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
            { title: 'Advanced Feed Management', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
        ]
    },
    {
        id: 'roadrunner-rearing',
        title: 'Indigenous Poultry Management',
        subtitle: 'Specialized management to raise premium Road Runner chickens.',
        image: 'images/roadrunner-card.png',
        price: '9.99',
        description: 'Move beyond basic poultry. Learn specialized, indigenous poultry management techniques to raise premium-quality Road Runner chickens for a profitable niche market.',
        notes: [
            { title: 'Housing & Predator Proofing', content: 'Learn to build secure, low-cost housing using local materials. Includes detailed plans for predator-proofing your coop.' },
            { title: 'Natural Foraging & Feed', content: 'Master the art of supplementing natural diets. This section covers what to plant and how to create a balanced, cost-effective feeding plan.' },
            { title: 'Disease Resistance & Health', content: 'Leverage the natural hardiness of indigenous breeds. Learn about herbal remedies and preventative measures to keep your flock healthy without expensive medications.' },
            { title: 'Marketing Premium Birds', content: 'Identify and connect with niche markets that value free-range, indigenous poultry. Includes tips on branding and pricing.' }
        ],
        videos: [
             { title: 'Building a Predator-Proof Coop', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
             { title: 'Natural Feed Supplements', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
        ]
    },
    {
        id: 'mushroom-cultivation',
        title: 'Commercial Mushroom Cultivation',
        subtitle: 'Perfect substrate prep, sterile spawning, and climate control mastery.',
        image: 'images/mushroom-card.png',
        price: '9.99',
        description: 'Learn the three essential steps: perfect substrate preparation, sterile spawning to prevent contamination, and simple climate control to guarantee a successful harvest.',
         notes: [
            { title: 'Substrate & Sterilization', content: 'A deep dive into preparing the perfect growth medium for oyster mushrooms, including pasteurization and sterilization techniques.' },
            { title: 'Inoculation & Incubation', content: 'Learn the science of spawning. This section covers sterile procedures, spawn-to-substrate ratios, and creating the ideal incubation environment.' },
            { title: 'Fruiting & Climate Control', content: 'Master the techniques for inducing and managing mushroom growth, including humidity, temperature, and fresh air exchange.' },
            { title: 'Harvesting & Post-Harvest', content: 'Learn the best time to harvest, proper harvesting techniques, and how to pack and store your mushrooms for maximum freshness and shelf life.' }
        ],
        videos: [
            { title: 'Preparing Your Substrate', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
            { title: 'Building a Fruiting Chamber', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
        ]
    },
    {
        id: 'fish-farming',
        title: 'Sustainable Fish Farming',
        subtitle: 'Get the aquaculture basics right, focusing on Dissolved Oxygen (DO).',
        image: 'images/fish-card.png',
        price: '9.99',
        description: 'Get the aquaculture basics right, with a special focus on managing Dissolved Oxygen (DO) levels—the single most important factor for healthy, fast-growing Tilapia and Catfish.',
        notes: [
            { title: 'Pond & System Design', content: 'Learn how to design and build an efficient aquaculture system, whether you are using ponds, tanks, or recirculating systems.' },
            { title: 'Water Quality Mastery', content: 'A detailed guide to managing pH, ammonia, nitrites, and nitrates. This section provides practical tips for maintaining optimal water quality.' },
            { title: 'Feeding & Growth', content: 'Optimize your feeding strategy for fast, healthy growth. Learn about different types of feed and how to calculate the correct feeding rates.' },
            { title: 'Disease Prevention', content: 'Proactive strategies for keeping your fish stock healthy and preventing common diseases in Tilapia and Catfish.' }
        ],
         videos: [
            { title: 'Managing Water Quality', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
            { title: 'Effective Feeding Strategies', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
        ]
    },
    {
        id: 'maize-farming',
        title: 'High-Performance Maize Farming',
        subtitle: 'Discover techniques for fertilizer timing, drought protection, and maximizing yield.',
        image: 'images/maize-card.png',
        price: '9.99',
        description: 'Discover the best techniques for timing your fertilizer, how to protect your crops during drought, and simple steps to maximize your yield every season.',
        notes: [
            { title: 'Soil Health & Preparation', content: 'The foundation of a great harvest. This section covers soil testing, amendments, and proper tillage techniques.' },
            { title: 'Advanced Fertilizer Strategy', content: 'Learn about basal vs. top dressing, micronutrients, and timing your fertilizer applications for maximum nutrient uptake.' },
            { title: 'Water Conservation', content: 'Explore techniques for drought resistance, including conservation tillage, mulching, and efficient irrigation.' },
            { title: 'Pest & Disease Control', content: 'Implement integrated pest management (IPM) strategies to control common maize pests and diseases effectively.' }
        ],
        videos: [
            { title: 'Soil Preparation for Maize', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
            { title: 'Effective Pest Control', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
        ]
    },
    {
        id: 'tobacco-farming',
        title: 'High-Value Tobacco Farming',
        subtitle: 'Professional curing techniques for premium, market-ready leaves.',
        image: 'images/tobbaco-card.png',
        price: '9.99',
        description: 'Focus on the high-value side of this crop. Learn the art of professional curing techniques and effective sucker control to produce premium, market-ready leaves.',
        notes: [
            { title: 'Seedbed to Transplanting', content: 'Master the art of nurturing healthy seedlings, from seedbed preparation to successful transplanting in the field.' },
            { title: 'Field Management', content: 'Learn about topping, suckering, and developing a balanced nutrition plan to produce high-quality leaves.' },
            { title: 'The Art of Curing', content: 'A detailed guide to different curing techniques, including air-curing and flue-curing, to achieve the perfect color and texture.' },
            { title: 'Grading & Marketing', content: 'Understand the market requirements for grading your leaf and learn how to get the best price for your high-quality tobacco.' }
        ],
        videos: [
            { title: 'Proper Curing Techniques', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
            { title: 'Grading for the Market', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
        ]
    }
];

// This function writes the initial course data to Firestore.
// It uses a batch write to add all courses in a single operation.
async function addInitialCourses(db) {
    const batch = db.batch();
    initialCourses.forEach(course => {
        // In v8, we get the reference slightly differently
        const docRef = db.collection("courses").doc(course.id);
        batch.set(docRef, course);
    });

    try {
        await batch.commit();
        console.log("Database seeded successfully with initial course data.");
    } catch (error) {
        console.error("Error seeding database:", error);
    }
}
