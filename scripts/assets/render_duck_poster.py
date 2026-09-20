import bpy
import sys
import math
import mathutils

argv = sys.argv[sys.argv.index("--") + 1:]
input_path, output_path = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=input_path)

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

# 3/4 angle camera instead of a flat side profile
angle = math.radians(35)
cam_x = center.x + math.sin(angle) * radius * 2.4
cam_y = center.y - math.cos(angle) * radius * 2.4
cam_z = center.z + radius * 0.35

bpy.ops.object.camera_add(location=(cam_x, cam_y, cam_z))
camera = bpy.context.object
direction = center - mathutils.Vector((cam_x, cam_y, cam_z))
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.camera = camera

# Three-point-ish lighting so the underside isn't pure black
key = bpy.data.objects.new("key", bpy.data.lights.new("key", type="SUN"))
key.data.energy = 3.5
key.location = (center.x + radius, center.y - radius, center.z + radius * 2)
bpy.context.collection.objects.link(key)

fill = bpy.data.objects.new("fill", bpy.data.lights.new("fill", type="SUN"))
fill.data.energy = 1.6
fill.location = (center.x - radius, center.y - radius * 0.5, center.z + radius * 0.5)
bpy.context.collection.objects.link(fill)

rim = bpy.data.objects.new("rim", bpy.data.lights.new("rim", type="SUN"))
rim.data.energy = 1.2
rim.location = (center.x, center.y + radius * 1.5, center.z + radius)
bpy.context.collection.objects.link(rim)

world = bpy.data.worlds.new("World")
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.85, 0.9, 0.95, 1.0)
bg.inputs[1].default_value = 0.6
bpy.context.scene.world = world

scene = bpy.context.scene
engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.film_transparent = True
scene.render.filepath = output_path
bpy.ops.render.render(write_still=True)
print("POSTER_DONE", output_path)
