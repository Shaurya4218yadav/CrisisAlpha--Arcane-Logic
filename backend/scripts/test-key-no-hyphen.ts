import fetch from 'node-fetch';

const key = "904f0e19fcd94e38ae35290aecfbd4db";

async function testApi(name: string, url: string) {
    try {
        const res = await fetch(url);
        const text = await res.text();
        console.log(`[${name}] Status: ${res.status} | Data: ${text.substring(0, 100)}`);
    } catch (e: any) {
        console.error(`[${name}] Error: ${e.message}`);
    }
}

async function run() {
    await testApi("NewsAPI", `https://newsapi.org/v2/top-headlines?country=us&apiKey=${key}`);
    await testApi("GNews", `https://gnews.io/api/v4/search?q=example&token=${key}`);
    await testApi("Currents", `https://api.currentsapi.services/v1/latest-news?apiKey=${key}`);
    await testApi("Mediastack", `http://api.mediastack.com/v1/news?access_key=${key}`);
}

run();
