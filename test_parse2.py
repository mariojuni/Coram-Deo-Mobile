import lxml.html
html = '<span class="note"><span class="ref">Matt. 10:16</span></span>the serpent'
tree = lxml.html.fragment_fromstring(html, create_parent='div')
note = tree.xpath('.//span[@class="note"]')[0]
print(repr(note.text_content()))
print(repr(note.tail))
