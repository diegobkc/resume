import bpy
import sys
import math

argv = sys.argv[sys.argv.index("--") + 1:]
input_path, output_path = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=input_path)

# Compute bounding box of all imported mesh objects to frame the camera
import mathutils
min_co = mathutils.Vector((float("inf"),) * 3)
max_co = mathutils.Vector((float("-inf"),) * 3)
for obj in bpy.context.scene.objects:
    if obj.type != "MESH":
        continue
    for corner in obj.bound_box:
        world_co = obj.matrix_world @ mathutils.Vector(corner)
        min_co = mathutils.Vector(map(min, min_co, world_co))
        max_co = mathutils.Vector(map(max, max_co, world_co))

center = (min_co + max_co) / 2
size = max_co - min_co
radius = max(size.x, size.y, size.z, 0.1)

bpy.ops.object.camera_add(
    location=(center.x, center.y - radius * 2.6, center.z + radius * 0.15),
    rotation=(math.radians(88), 0, 0),
)
camera = bpy.context.object
bpy.context.scene.camera = camera

bpy.ops.object.light_add(type="SUN", location=(center.x + radius, center.y - radius, center.z + radius * 2))
bpy.context.object.data.energy = 4

bpy.ops.object.light_add(type="SUN", location=(center.x - radius, center.y - radius, center.z + radius))
bpy.context.object.data.energy = 2

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
scene.render.resolution_x = 700
scene.render.resolution_y = 700
scene.render.film_transparent = True
scene.render.filepath = output_path
bpy.ops.render.render(write_still=True)
print("RENDER_DONE", output_path)
