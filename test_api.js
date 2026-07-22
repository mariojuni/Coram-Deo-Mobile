const API_BASE = 'https://api.youversion.com/v1';
const API_KEY = 'RAhHurUzL1pk5kt9LwrGIaz0AdnX0obcIH6NNIayuvGogR7f';
const headers = { 'x-yvp-app-key': API_KEY, 'Accept': 'application/json' };

async function run() {
  const res = await fetch(API_BASE + '/bibles/111/passages/GEN.1.1', { headers });
  const data = await res.json();
  console.log("Verse response:", JSON.stringify(data, null, 2));

  const res2 = await fetch(API_BASE + '/bibles/111/passages/GEN.1?format=html', { headers });
  const data2 = await res2.json();
  console.log("Chapter response:", JSON.stringify(data2, null, 2));
}
run();
