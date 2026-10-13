# So sánh 2 ảnh full-page cạnh nhau theo từng đoạn: python3 scripts/compare.py orig.png clone.png outprefix [chunk]
import sys
from PIL import Image
a=Image.open(sys.argv[1]).convert('RGB'); b=Image.open(sys.argv[2]).convert('RGB')
out=sys.argv[3]; ch=int(sys.argv[4]) if len(sys.argv)>4 else 1600
w=max(a.width,b.width); H=max(a.height,b.height); n=0
for y in range(0,H,ch):
    im=Image.new('RGB',(w*2+20,ch),'magenta')
    if y<a.height: im.paste(a.crop((0,y,a.width,min(a.height,y+ch))),(0,0))
    if y<b.height: im.paste(b.crop((0,y,b.width,min(b.height,y+ch))),(w+20,0))
    im=im.resize((im.width//2,im.height//2))
    im.save(f'{out}{n:02d}.png'); n+=1
print(n)
