const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 5000;
const SOLR_URL = 'http://localhost:8983/solr/steam_games/select';

app.use(cors());
app.use(express.json());

app.get('/api/autocomplete', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);
        
        const response = await axios.get(SOLR_URL, {
            params: {
                q: `name:*${q}*`,
                rows: 5,
                fl: 'name',
                wt: 'json'
            }
        });
        
        const suggestions = response.data.response.docs.map(doc => doc.name);
        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ error: 'Autocomplete failed' });
    }
});

app.get('/api/search', async (req, res) => {
    try {
        const { q = '*:*', category, platform, page = 1, rows = 12, sort } = req.query;
        const start = (page - 1) * rows;
        
        const solrParams = new URLSearchParams();
        
        solrParams.append('q', q === '*:*' ? '*:*' : `name:*${q}*`);
        solrParams.append('start', start);
        solrParams.append('rows', rows);
        solrParams.append('wt', 'json');

        solrParams.append('facet', 'true');
        solrParams.append('facet.field', 'categories');
        solrParams.append('facet.field', 'platforms');
        solrParams.append('facet.mincount', '1');

        solrParams.append('hl', 'true');
        solrParams.append('hl.fl', 'name');
        solrParams.append('hl.simple.pre', '<em>');
        solrParams.append('hl.simple.post', '</em>');

        if (category) solrParams.append('fq', `categories:"${category}"`);
        if (platform) solrParams.append('fq', `platforms:"${platform}"`);
        
        if (sort) solrParams.append('sort', sort);

        const response = await axios.get(`${SOLR_URL}?${solrParams.toString()}`);
        res.json(response.data);

    } catch (error) {
        console.error('Solr Proxy Error:', error.message);
        res.status(500).json({ error: 'Backend failed to communicate with Solr.' });
    }
});

app.listen(PORT, () => console.log(`Proxy operational on port ${PORT}`));