import re
import lxml.html

html_str = '<span class="yv-v" v="1">Now <span class="note" data-usfm="GEN.3.1"><span class="ref" data-usfm="MAT.10.16">Matt. 10:16</span></span>the serpent was more crafty than any other beast of the field that the Lord God had made. He said to the woman, “Did God actually say, ‘You<span class="note" data-usfm="GEN.3.1">#3:1 In Hebrew you is plural in verses 1–5</span> shall not eat of any tree in the garden’?”</span>'
verse_regex = re.compile(r'<span[^>]*class="[^"]*yv-v[^"]*"[^>]*v="(\d+)"[^>]*>(.*?)</span>(.*?)(?=<span[^>]*class="[^"]*yv-v|$)', re.DOTALL)

for match in verse_regex.finditer(html_str):
    verse_number = match.group(1)
    raw_text_parts = match.group(2) + ' ' + match.group(3)
    
    cross_references = []
    tree = lxml.html.fragment_fromstring(raw_text_parts, create_parent='div')
    for note in tree.xpath('//*[contains(@class, "note") or contains(@class, "crossreference")]'):
        refs = []
        for ref_span in note.xpath('.//span[@class="ref"]'):
            ref_usfm = ref_span.get('data-usfm')
            if ref_usfm:
                refs.append({'id': ref_usfm, 'text': ref_span.text_content().strip()})
        
        note_text = note.text_content().strip().lstrip('#').strip()
        if note_text:
            if len(refs) > 0:
                cross_references.append({'text': note_text, 'refs': refs})
            else:
                cross_references.append({'text': note_text})
            marker = lxml.html.Element('span')
            marker.text = f'{{{{note:{len(cross_references)-1}}}}}'
            note.getparent().replace(note, marker)
        else:
            note.drop_tree()
            
    clean_text = tree.text_content()
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    print("Content:", clean_text)
    print("CrossRefs:", cross_references)

