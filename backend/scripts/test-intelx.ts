import fetch from 'node-fetch';

const API_KEY = '904f0e19-fcd9-4e38-ae35-290aecfbd4db';
const search_term = 'port strike';

async function testIntelX() {
    try {
        // Intelligence X API Intelligent Search endpoint
        const response = await fetch('https://2.intelx.io/intelligent/search', {
            method: 'POST',
            headers: {
                'x-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "term": search_term,
                "maxresults": 5,
                "media": 0,
                "sort": 2
            })
        });
        
        const data = await response.json();
        console.log("IntelX Search Response:", JSON.stringify(data, null, 2));
    } catch(e: any) {
        console.error("IntelX Error:", e.message);
    }
}

testIntelX();
