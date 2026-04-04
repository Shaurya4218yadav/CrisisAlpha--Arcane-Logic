import fetch from 'node-fetch';

const key = "904f0e19-fcd9-4e38-ae35-290aecfbd4db";

async function testApi(name: string, url: string, headers?: any) {
    try {
        const res = await fetch(url, { headers });
        const text = await res.text();
        console.log(`[${name}] Status: ${res.status} | Data: ${text.substring(0, 100)}`);
    } catch (e: any) {
        console.error(`[${name}] Error: ${e.message}`);
    }
}

async function run() {
    await testApi("Storm Glass", `https://api.stormglass.io/v2/weather/point?lat=58.7984&lng=17.8081&params=airTemperature`, { 'Authorization': key });
    await testApi("OpenMeteo", `https://customer-api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&apikey=${key}`);
    await testApi("GNews", `https://gnews.io/api/v4/search?q=example&token=${key}`);
    await testApi("Currents", `https://api.currentsapi.services/v1/latest-news?apiKey=${key}`);
    await testApi("NewsData", `https://newsdata.io/api/1/news?apikey=${key}`);
    await testApi("Mediastack", `http://api.mediastack.com/v1/news?access_key=${key}`);
}

run();
