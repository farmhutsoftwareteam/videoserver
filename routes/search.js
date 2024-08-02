const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// Define the search route
router.get('/search', async (req, res) => {
    const query = req.query.query ? req.query.query.trim() : ''; // Ensure there are no trailing spaces
    console.log('Received search query:', query);

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        // Log query before executing
        const searchQuery = `%${query}%`;
        console.log(`Executing queries on episodes, categories, and shows tables with ilike '${searchQuery}'`);

        // Perform the search queries in parallel
        const [episodesData, categoriesData, showsData] = await Promise.all([
            supabase
                .from('episodes')
                .select('*')
                .or(`title.ilike.${searchQuery},description.ilike.${searchQuery}`),
            supabase
                .from('categories')
                .select('*')
                .ilike('name', searchQuery),
            supabase
                .from('shows')
                .select('*')
                .or(`title.ilike.${searchQuery},description.ilike.${searchQuery}`)
        ]);

        // Check for errors
        if (episodesData.error || categoriesData.error || showsData.error) {
            const errors = {
                episodes: episodesData.error,
                categories: categoriesData.error,
                shows: showsData.error,
            };
            console.error('Error searching tables:', errors);
            return res.status(500).json(errors);
        }

        // Merge results
        const results = {
            episodes: episodesData.data,
            categories: categoriesData.data,
            shows: showsData.data,
        };

        console.log('Search results:', results);
        res.status(200).json(results);
    } catch (error) {
        console.error('Error in search route:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
