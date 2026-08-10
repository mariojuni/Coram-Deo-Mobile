import re
import lxml.html

html_str = '''
<span class="yv-v" v="1">Now <span class="note"><span class="ref">Matt. 10:16</span></span>the serpent... ‘You<span class="note">#3:1 In Hebrew</span> shall not eat...’</span>
'''

verse_regex = re.compile(r'<span[^>]*class="[^"]*yv-v[^"]*"[^>]*v="(\d+)"[^>]*>(.*?)</span>(.*?)(?=<span[^>]*class="[^"]*yv-v|$)', re.DOTALL)

for match in verse_regex.finditer(html_str):
    raw_text_parts = match.group(2) + ' ' + match.group(3)
    print("RAW:", repr(raw_text_parts))
    tree = lxml.html.fragment_fromstring(raw_text_parts, create_parent='div')
    notes = tree.xpath('//*[contains(@class, "note") or contains(@class, "crossreference")]')
    for note in notes:
        print("NOTE:", repr(note.text_content()), "TAIL:", repr(note.tail))
        marker = lxml.html.Element('span')
        marker.text = f'{{{{note:0}}}}'
        if note.tail:
            marker.tail = note.tail
        note.getparent().replace(note, marker)
    print("CLEAN:", repr(tree.text_content()))
