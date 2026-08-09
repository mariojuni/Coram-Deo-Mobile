const fetch = require('node-fetch');

const API_BASE = 'https://api.youversion.com/v1';
const API_KEY = 'RAhHurUzL1pk5kt9LwrGIaz0AdnX0obcIH6NNIayuvGogR7f';

const getHeaders = () => ({
  'x-yvp-app-key': API_KEY,
  Accept: 'application/json',
  'User-Agent': 'CoramDeo/1.0.0 (Android)',
});

async function listBibles() {
  try {
    const res = await fetch(`${API_BASE}/bibles?language_tag=eng`, { headers: getHeaders() });
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}

listBibles();
