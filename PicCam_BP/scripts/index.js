import * as mc from "@minecraft/server";
import {
  ActionFormData,
  ModalFormData,
  MessageFormData,
} from "@minecraft/server-ui";
import { Database } from "./Database";

const tbl_camera = new Database("camera");

// let actionForm = new ActionFormData();
// actionForm.body("Test");

// let messageForm = new MessageFormData();
// messageForm.body("test");
// messageForm.button1("b1");
// messageForm.button2("b2");

// for (let index = 0; index < 3; index++) {
//   // const element = array[index];
//   actionForm.button(index.toString());
// }

mc.system.runInterval(() => {
  mc.world.getPlayers().forEach((player) => {
    if (player.hasTag("camActive")) {
      let data = tbl_camera.get(player.id);
      if (player.hasTag("camLock")) {
        data["previousRot"] = player.getRotation();
        tbl_camera.set(player.id, data);
        return;
      }

      const playerRotation = player.getRotation();
      const cameraDir = player.getViewDirection();

      if (player.isJumping) {
        data["cameraPos"].x += cameraDir.x * data["camSpeed"];
        data["cameraPos"].z += cameraDir.z * data["camSpeed"];
        data["cameraPos"].y += cameraDir.y * data["camSpeed"];
      } else if (player.isSneaking) {
        data["cameraPos"].x -= cameraDir.x * data["camSpeed"];
        data["cameraPos"].z -= cameraDir.z * data["camSpeed"];
        data["cameraPos"].y -= cameraDir.y * data["camSpeed"];
      }

      player.camera.setCamera("minecraft:free", {
        easeOptions: {
          easeTime: 0.1, //ใส่ระยะ 0.1 เพื่อให้ดูสมูทขึ้น
          easeType: "Linear", //ใส่ประเภทเป็น linear เพื่อให้กล้องขยับแบบสมูท
        },
        location: data["cameraPos"],
        rotation: playerRotation,
      });

      data["previousRot"] = playerRotation;
      tbl_camera.set(player.id, data);
    }
  });
});

function camera(player) {
  try {
    player.removeTag("camLock");
    let data = tbl_camera.get(player.id);
    data["cameraDir"] = player.getViewDirection();
    data["cameraRot"] = player.getRotation();
    data["cameraPos"] = {
      x: player.location.x - 10 * data["cameraDir"].x,
      y: player.location.y + 2,
      z: player.location.z - 10 * data["cameraDir"].z,
    };

    tbl_camera.set(player.id, data);

    if (player.hasTag("camActive")) {
      player.removeTag("camActive");

      mc.system.runTimeout(() => player.camera.clear(), 5);
    } else {
      player.camera.setCamera("minecraft:free", {
        easeOptions: {
          easeTime: 0.2,
          easeType: "InOutCirc",
        },
        location: data["cameraPos"],
        rotation: data["cameraRot"],
      });

      player.addTag("camActive");
    }
  } catch (error) {
    player.sendMessage(`§cError setting camera: ${error.message}`);
    mc.world.sendMessage(`Camera error for ${player.name}: ${error.message}`);
  }
}

mc.world.afterEvents.playerJoin.subscribe(({ playerId }) => {
  //initiate camera tbl
  tbl_camera.set(playerId, {
    cameraPos: { x: 0, y: 0, z: 0 },
    cameraRot: { x: 0, y: 0 },
    cameraDir: { x: 0, y: 0, z: 0 },
    previousRot: { x: 0, y: 0 },
    camSpeed: 0.5,
  });
});

mc.world.afterEvents.itemUse.subscribe(({ source: player, itemStack }) => {
  if (player) {
    let data = tbl_camera.get(player.id);

    if (itemStack.typeId === "ezilys:camera_lock") {
      if (player.hasTag("camActive")) {
        //
        if (player.hasTag("camLock")) {
          player.removeTag("camLock");
          data["cameraDir"] = player.getViewDirection();
          data["cameraRot"] = player.getRotation();
          tbl_camera.set(player.id, data);
        } else {
          mc.world.sendMessage("Camlock");
          player.addTag("camLock");
        }
      }
    } else if (itemStack.typeId === "ezilys:camera" && player.isSneaking) {
      let modalFormData = new ModalFormData();
      modalFormData.slider("CamSpeed", 1, 5, 1, 1);
      modalFormData.show(player).then(({ formValues }) => {
        data["camSpeed"] = 0.5 * formValues;
        tbl_camera.set(player.id, data);
      });
    } else if (itemStack.typeId === "ezilys:camera") camera(player);
  }
});
