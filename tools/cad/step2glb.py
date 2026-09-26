#!/usr/bin/env python3
"""STEP assembly -> binary glTF, keeping the assembly tree, part names and colors.

Tessellates with OCCT (relative deflection, so small parts stay smooth and big plates stay light)
and writes .glb with RWGltf_CafWriter. No geometry is altered; simplification (dropping screws,
merging static parts, compression) happens afterwards in optimize-cad.mjs.

usage: python3 step2glb.py in.step out.glb [--deflection 0.4] [--angle 0.5]
  --deflection  chordal deflection in mm (absolute); smaller = finer mesh
"""
import argparse, os, sys, time
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TDocStd import TDocStd_Document
from OCP.TCollection import TCollection_ExtendedString, TCollection_AsciiString
from OCP.XCAFDoc import XCAFDoc_DocumentTool
from OCP.IFSelect import IFSelect_RetDone
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.RWGltf import RWGltf_CafWriter
from OCP.OCP.collections import IndexedDataMap_TCollection_AsciiString_TCollection_AsciiString as StrMap
from OCP.Message import Message_ProgressRange
from OCP.RWMesh import RWMesh_CoordinateSystem
from OCP.OCP.collections import Sequence_TDF_Label as TDF_LabelSequence
from OCP.Interface import Interface_Static

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--deflection', type=float, default=0.4)
ap.add_argument('--angle', type=float, default=0.5)
a = ap.parse_args()
t0 = time.time()
Interface_Static.SetCVal_s('xstep.cascade.unit', 'MM')
doc = TDocStd_Document(TCollection_ExtendedString('doc'))
r = STEPCAFControl_Reader(); r.SetNameMode(True); r.SetColorMode(True); r.SetLayerMode(True)
if r.ReadFile(a.src) != IFSelect_RetDone:
    sys.exit('could not read ' + a.src)
r.Transfer(doc)
t1 = time.time()
st = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())
free = TDF_LabelSequence(); st.GetFreeShapes(free)
n = 0
for i in range(1, free.Length() + 1):
    shape = st.GetShape_s(free.Value(i))
    BRepMesh_IncrementalMesh(shape, a.deflection, False, a.angle, True)
    n += 1
t2 = time.time()
w = RWGltf_CafWriter(TCollection_AsciiString(a.dst), True)
# glTF is metres, y up; STEP from Fusion is mm, z up
w.ChangeCoordinateSystemConverter().SetInputLengthUnit(0.001)
w.ChangeCoordinateSystemConverter().SetInputCoordinateSystem(RWMesh_CoordinateSystem.RWMesh_CoordinateSystem_Zup)
w.Perform(doc, StrMap(), Message_ProgressRange())
print(f'{os.path.basename(a.src)}: read {t1 - t0:.0f} s, mesh {t2 - t1:.0f} s, write {time.time() - t2:.0f} s, '
      f'{os.path.getsize(a.dst) / 1e6:.1f} MB')
