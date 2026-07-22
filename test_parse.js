const parseHTMLToJSON = (html, passageId) => {
  const verses = [];
  const verseRegex = /<span[^>]*class="[^"]*yv-v[^"]*"[^>]*v="(\d+)"[^>]*>(.*?)<\/span>(.*?)(?=<span[^>]*class="[^"]*yv-v|$)/gs;
  let match;

  while ((match = verseRegex.exec(html)) !== null) {
    const verseNumber = match[1];
    const rawText = (match[2] + ' ' + match[3]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (rawText.length > 0) {
      verses.push({ id: `${passageId}.${verseNumber}`, verseNumber, content: rawText });
    }
  }
  return verses;
};
const html = `<span class="yv-v" v="1">In the beginning</span> God created <span class="yv-v" v="2">the heaven</span>`;
console.log(parseHTMLToJSON(html, 'GEN.1'));
