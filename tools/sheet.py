import sys
from PIL import Image
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims=[Image.open(f) for f in files]
w=720; h=int(ims[0].height*w/ims[0].width)
rows=(len(ims)+cols-1)//cols
W=Image.new('RGB',(w*cols,h*rows),'black')
for i,im in enumerate(ims): W.paste(im.convert('RGB').resize((w,h)),((i%cols)*w,(i//cols)*h))
W.save(out,quality=85)
