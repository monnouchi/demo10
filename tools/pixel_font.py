"""Build the original Pulse Hop 5x7 alphabet. Requires fonttools and brotli."""
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from pathlib import Path
import sys
patterns = {
'A':'01110 10001 10001 11111 10001 10001 10001','B':'11110 10001 10001 11110 10001 10001 11110','C':'01111 10000 10000 10000 10000 10000 01111','D':'11110 10001 10001 10001 10001 10001 11110','E':'11111 10000 10000 11110 10000 10000 11111','F':'11111 10000 10000 11110 10000 10000 10000','G':'01111 10000 10000 10111 10001 10001 01110','H':'10001 10001 10001 11111 10001 10001 10001','I':'11111 00100 00100 00100 00100 00100 11111','J':'00111 00010 00010 00010 10010 10010 01100','K':'10001 10010 10100 11000 10100 10010 10001','L':'10000 10000 10000 10000 10000 10000 11111','M':'10001 11011 10101 10101 10001 10001 10001','N':'10001 11001 11001 10101 10011 10011 10001','O':'01110 10001 10001 10001 10001 10001 01110','P':'11110 10001 10001 11110 10000 10000 10000','Q':'01110 10001 10001 10001 10101 10010 01101','R':'11110 10001 10001 11110 10100 10010 10001','S':'01111 10000 10000 01110 00001 00001 11110','T':'11111 00100 00100 00100 00100 00100 00100','U':'10001 10001 10001 10001 10001 10001 01110','V':'10001 10001 10001 10001 10001 01010 00100','W':'10001 10001 10001 10101 10101 10101 01010','X':'10001 10001 01010 00100 01010 10001 10001','Y':'10001 10001 01010 00100 00100 00100 00100','Z':'11111 00001 00010 00100 01000 10000 11111',
'0':'01110 10001 10011 10101 11001 10001 01110','1':'00100 01100 00100 00100 00100 00100 01110','2':'01110 10001 00001 00010 00100 01000 11111','3':'11110 00001 00001 01110 00001 00001 11110','4':'00010 00110 01010 10010 11111 00010 00010','5':'11111 10000 10000 11110 00001 00001 11110','6':'01110 10000 10000 11110 10001 10001 01110','7':'11111 00001 00010 00100 01000 01000 01000','8':'01110 10001 10001 01110 10001 10001 01110','9':'01110 10001 10001 01111 00001 00001 01110',
'/':'00001 00001 00010 00100 01000 10000 10000',':':'00000 00100 00100 00000 00100 00100 00000','.':'00000 00000 00000 00000 00000 00100 00100','!':'00100 00100 00100 00100 00100 00000 00100','?':'01110 10001 00001 00010 00100 00000 00100','-':'00000 00000 00000 11111 00000 00000 00000','+':'00000 00100 00100 11111 00100 00100 00000','%':'11001 11010 00100 01000 10110 00110 00000',
}
# Grave accent above the existing U; lowercase uses the same pixel capitals.
patterns['Ù']='01000 00100 '+patterns['U']
fb=FontBuilder(1000,isTTF=True)
names={ch:'g'+str(ord(ch)) for ch in patterns}
order=['.notdef','space']+list(names.values());fb.setupGlyphOrder(order)
glyphs={};metrics={};cmap={32:'space'}
for name in order:
 pen=TTGlyphPen(None)
 rows=patterns.get(next((ch for ch,n in names.items() if n==name),'') ,'').split()
 for row,bits in enumerate(rows):
  for col,bit in enumerate(bits):
   if bit!='1':continue
   x=col*100;y=(len(rows)-1-row)*100
   pen.moveTo((x,y));pen.lineTo((x,y+90));pen.lineTo((x+90,y+90));pen.lineTo((x+90,y));pen.closePath()
 glyphs[name]=pen.glyph();metrics[name]=(600,0)
for ch,name in names.items():
 cmap[ord(ch)]=name
 if ch.isalpha():cmap[ord(ch.lower())]=name
fb.setupCharacterMap(cmap);fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=800,descent=-200)
fb.setupNameTable({'familyName':'Pulse Pixel','styleName':'Regular','uniqueFontIdentifier':'PulseHop-Pixel-1','fullName':'Pulse Pixel','psName':'PulsePixel','version':'Version 1.0','copyright':'Original pixel alphabet created for Pulse Hop, 2026.'})
fb.setupOS2(sTypoAscender=800,sTypoDescender=-200,usWinAscent=1000,usWinDescent=200,sxHeight=700,sCapHeight=700);fb.setupPost();fb.setupMaxp();fb.font.flavor='woff2'
out=Path(sys.argv[1] if len(sys.argv)>1 else 'public/fonts/pulse-pixel.woff2');out.parent.mkdir(parents=True,exist_ok=True);fb.save(out);print(out,out.stat().st_size)
