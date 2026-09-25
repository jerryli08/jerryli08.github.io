# Lists the cylindrical faces (pin holes, bores) of named parts in a STEP file, with their axes.
# Used to find the real latch pivot axes that world.js rigs. Usage: cad-axes.py file.step "regex"
import sys, re
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TDocStd import TDocStd_Document
from OCP.TCollection import TCollection_ExtendedString
from OCP.XCAFDoc import XCAFDoc_DocumentTool
from OCP.TDF import TDF_Label
from OCP.OCP.collections import Sequence_TDF_Label as TDF_LabelSequence
from OCP.TDataStd import TDataStd_Name
from OCP.IFSelect import IFSelect_RetDone
from OCP.TopLoc import TopLoc_Location
from OCP.TopAbs import TopAbs_FACE
from OCP.TopExp import TopExp_Explorer
from OCP.TopoDS import TopoDS
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.GeomAbs import GeomAbs_Cylinder
from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib

def load(path):
    doc = TDocStd_Document(TCollection_ExtendedString("doc"))
    r = STEPCAFControl_Reader(); r.SetNameMode(True)
    assert r.ReadFile(path) == IFSelect_RetDone
    r.Transfer(doc); return doc
def name(l):
    a = TDataStd_Name()
    return a.Get().ToExtString() if l.FindAttribute(TDataStd_Name.GetID_s(), a) else '?'
path, pat = sys.argv[1], re.compile(sys.argv[2])
doc = load(path)
st = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())
roots = TDF_LabelSequence(); st.GetFreeShapes(roots)
def report(label_path, shape):
    seen = {}
    e = TopExp_Explorer(shape, TopAbs_FACE)
    while e.More():
        f = TopoDS.Face(e.Current()); s = BRepAdaptor_Surface(f)
        if s.GetType() == GeomAbs_Cylinder:
            c = s.Cylinder(); ax = c.Axis(); d = ax.Direction(); p = ax.Location(); r = c.Radius()
            if 0.4 < r < 9:
                dx, dy, dz = d.X(), d.Y(), d.Z()
                # project the axis point onto the plane through origin perpendicular to the axis, for a stable key
                if abs(dx) > 0.9: key = ('X', round(p.Y(), 1), round(p.Z(), 1), round(r, 2))
                elif abs(dy) > 0.9: key = ('Y', round(p.X(), 1), round(p.Z(), 1), round(r, 2))
                elif abs(dz) > 0.9: key = ('Z', round(p.X(), 1), round(p.Y(), 1), round(r, 2))
                else: key = ('?', round(dx,2), round(dy,2), round(dz,2), round(p.X(),1), round(p.Y(),1), round(p.Z(),1), round(r,2))
                b = Bnd_Box(); BRepBndLib.Add_s(f, b); lo, hi = b.CornerMin(), b.CornerMax()
                span = (round(lo.X(),1), round(hi.X(),1)) if key[0]=='X' else ((round(lo.Y(),1), round(hi.Y(),1)) if key[0]=='Y' else (round(lo.Z(),1), round(hi.Z(),1)))
                seen.setdefault(key, set()).add(span)
        e.Next()
    print(label_path)
    for k in sorted(seen, key=lambda k: (k[0], k[-1])):
        print('   ', k, sorted(seen[k])[:3])
def walk(l, loc, path):
    ref = TDF_Label(); lbl = l
    if st.IsReference_s(l): st.GetReferredShape_s(l, ref); lbl = ref
    nm = name(l)
    shape = st.GetShape_s(l)
    here = loc.Multiplied(shape.Location()) if st.IsReference_s(l) else loc
    p = path + '/' + nm
    kids = TDF_LabelSequence(); st.GetComponents_s(lbl, kids)
    if pat.search(nm) and kids.Length() == 0:
        report(p, st.GetShape_s(lbl).Moved(here))
    for i in range(1, kids.Length()+1): walk(kids.Value(i), here, p)
for i in range(1, roots.Length()+1): walk(roots.Value(i), TopLoc_Location(), '')
