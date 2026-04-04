import fetch from 'node-fetch';

const API_KEY = '904f0e19-fcd9-4e38-ae35-290aecfbd4db';
const search_term = 'logistics crisis';

async function testIntelX() {
    try {
        console.log("Starting IntelX test...");
        // 1. Start search
        const searchRes = await fetch('https://2.intelx.io/intelligent/search', {
            method: 'POST',
            headers: { 'x-key': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                term: search_term,
                maxresults: 5,
                media: 0,
                sort: 2
            })
        });
        
        if (!searchRes.ok) {
            console.error("Search failed:", searchRes.status, await searchRes.text());
            return;
        }
        
        const searchData = await searchRes.json();
        console.log("Search started, ID:", searchData.id);
        
        if (!searchData.id) return;
        
        // Wait a bit for results
        await new Promise(r => setTimeout(r, 2000));
        
        // 2. Poll results
        const resultRes = await fetch(`https://2.intelx.io/intelligent/search/result?id=${searchData.id}&limit=5`, {
            method: 'GET',
            headers: { 'x-key': API_KEY }
        });
        
        const resultData = await resultRes.json();
        console.log("Results items:", resultData.records?.length || 0);
        if (resultData.records && resultData.records.length > 0) {
            console.log("First item:", resultData.records[0].name);
        }
    } catch(e: any) {
        console.error("IntelX Error:", e.message);
    }
}

testIntelX();
