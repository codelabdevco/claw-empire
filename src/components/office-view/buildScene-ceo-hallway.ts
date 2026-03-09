import type { MutableRefObject } from "react";
import { type Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import type { Agent, Task } from "../../types";
import type { Delivery, RoomTheme, WallClockVisual } from "./model";
import { CEO_ZONE_H, HALLWAY_H, OFFICE_FONT, TILE } from "./model";
import { LOCALE_TEXT, type SupportedLocale, pickLocale } from "./themes-locale";
import {
  blendColor,
  drawAmbientGlow,
  drawBandGradient,
  drawBunting,
  drawCeilingLight,
  drawPictureFrame,
  drawRoomAtmosphere,
  drawTiledFloor,
  drawTrashCan,
  drawWallClock,
  drawRug,
  drawWaterCooler,
  drawWindow,
} from "./drawing-core";
import { drawChair, drawPlant, drawWhiteboard } from "./drawing-furniture-a";
import { drawBookshelf, formatPeopleCount, formatTaskCount } from "./drawing-furniture-b";

interface BuildCeoAndHallwayParams {
  app: Application;
  OFFICE_W: number;
  totalH: number;
  breakRoomY: number;
  isDark: boolean;
  activeLocale: SupportedLocale;
  ceoTheme: RoomTheme;
  activeMeetingTaskId: string | null;
  onOpenActiveMeetingMinutes?: (taskId: string) => void;
  agents: Agent[];
  tasks: Task[];
  deliveriesRef: MutableRefObject<Delivery[]>;
  ceoMeetingSeatsRef: MutableRefObject<Array<{ x: number; y: number }>>;
  wallClocksRef: MutableRefObject<WallClockVisual[]>;
  ceoOfficeRectRef: MutableRefObject<{ x: number; y: number; w: number; h: number } | null>;
}

/* ================================================================== */
/*  Helper: draw a room sign (door gap + label badge) on top wall      */
/* ================================================================== */
function drawRoomSign(
  parent: Container,
  rx: number,
  ry: number,
  roomW: number,
  text: string,
  theme: RoomTheme,
): void {
  // Door gap
  const doorG = new Graphics();
  doorG.rect(rx + roomW / 2 - 16, ry - 2, 32, 5).fill(0xf5f0e8);
  parent.addChild(doorG);

  // Sign badge
  const label = new Text({
    text,
    style: new TextStyle({
      fontSize: 11,
      fill: 0xffffff,
      fontWeight: "bold",
      fontFamily: OFFICE_FONT,
      letterSpacing: 1.5,
      dropShadow: { alpha: 0.4, distance: 1, blur: 1, color: 0x000000 },
    }),
  });
  const signW = label.width + 10;
  const signX = rx + (roomW - signW) / 2;
  const signBg = new Graphics();
  signBg
    .roundRect(signX, ry + 4, signW, 15, 3)
    .fill({ color: blendColor(theme.accent, theme.wall, 0.35), alpha: 1 });
  signBg
    .roundRect(signX, ry + 4, signW, 15, 3)
    .stroke({ width: 1, color: blendColor(theme.accent, 0xffffff, 0.2), alpha: 0.8 });
  label.position.set(signX + 5, ry + 6);
  parent.addChild(signBg);
  parent.addChild(label);
}

/* ================================================================== */
/*  Helper: draw room base (floor, atmosphere, border)                 */
/* ================================================================== */
function drawRoomBase(
  parent: Container,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  theme: RoomTheme,
): void {
  const floor = new Graphics();
  drawTiledFloor(floor, rx, ry, rw, rh, theme.floor1, theme.floor2);
  parent.addChild(floor);
  drawRoomAtmosphere(parent, rx, ry, rw, rh, theme.wall, theme.accent);
  const border = new Graphics();
  border
    .roundRect(rx, ry, rw, rh, 3)
    .stroke({ width: 2, color: blendColor(theme.wall, theme.accent, 0.55) });
  border
    .roundRect(rx - 1, ry - 1, rw + 2, rh + 2, 4)
    .stroke({ width: 1, color: blendColor(theme.accent, 0xffffff, 0.2), alpha: 0.35 });
  parent.addChild(border);
}

export function buildCeoAndHallway({
  app,
  OFFICE_W,
  totalH,
  breakRoomY,
  isDark,
  activeLocale,
  ceoTheme,
  activeMeetingTaskId,
  onOpenActiveMeetingMinutes,
  agents,
  tasks,
  deliveriesRef,
  ceoMeetingSeatsRef,
  wallClocksRef,
  ceoOfficeRectRef,
}: BuildCeoAndHallwayParams): void {
  /* ── Background (covers entire canvas) ── */
  const bg = new Graphics();
  const bgFill = isDark ? 0x0e0e1c : 0xf5f0e8;
  const bgGradFrom = isDark ? 0x121222 : 0xf8f4ec;
  const bgGradTo = isDark ? 0x0a0a18 : 0xf0ece4;
  const bgStrokeInner = isDark ? 0x2a2a48 : 0xd8cfc0;
  const bgStrokeOuter = isDark ? 0x222240 : 0xe0d8cc;
  const bgDotColor = isDark ? 0x2a2a48 : 0xd0c8b8;
  bg.roundRect(0, 0, OFFICE_W, totalH, 6).fill(bgFill);
  drawBandGradient(bg, 2, 2, OFFICE_W - 4, totalH - 4, bgGradFrom, bgGradTo, 14, 0.82);
  bg.roundRect(2, 2, OFFICE_W - 4, totalH - 4, 5).stroke({ width: 1.5, color: bgStrokeInner, alpha: 0.55 });
  bg.roundRect(0, 0, OFFICE_W, totalH, 6).stroke({ width: 3, color: bgStrokeOuter });
  for (let i = 0; i < 22; i++) {
    const sx = 12 + ((i * 97) % Math.max(24, OFFICE_W - 24));
    const sy = 12 + ((i * 131) % Math.max(24, totalH - 24));
    bg.circle(sx, sy, i % 3 === 0 ? 1.1 : 0.8).fill({ color: bgDotColor, alpha: i % 2 === 0 ? 0.12 : 0.08 });
  }
  app.stage.addChild(bg);

  /* ── Room geometry ── */
  const outerPad = 4;
  const roomGap = 12;
  const roomY = outerPad;
  const roomH = CEO_ZONE_H - outerPad;
  const ceoRoomW = Math.floor((OFFICE_W - outerPad * 2 - roomGap) / 2);
  const meetRoomW = OFFICE_W - outerPad * 2 - roomGap - ceoRoomW;
  const ceoRoomX = outerPad;
  const meetRoomX = ceoRoomX + ceoRoomW + roomGap;

  const ceoLayer = new Container();

  /* ================================================================ */
  /*  ROOM 1 — CEO Office (left)                                      */
  /* ================================================================ */
  drawRoomBase(ceoLayer, ceoRoomX, roomY, ceoRoomW, roomH, ceoTheme);
  drawRoomSign(ceoLayer, ceoRoomX, roomY, ceoRoomW, pickLocale(activeLocale, LOCALE_TEXT.ceoOffice), ceoTheme);
  ceoOfficeRectRef.current = { x: ceoRoomX, y: roomY, w: ceoRoomW, h: roomH };

  // Ceiling lights + window + bunting
  drawCeilingLight(ceoLayer, ceoRoomX + ceoRoomW / 3, roomY + 8, ceoTheme.accent);
  drawCeilingLight(ceoLayer, ceoRoomX + (ceoRoomW * 2) / 3, roomY + 8, ceoTheme.accent);
  drawWindow(ceoLayer, ceoRoomX + ceoRoomW - 36, roomY + 24);
  drawBunting(
    ceoLayer,
    ceoRoomX + 10,
    roomY + 10,
    Math.max(60, ceoRoomW - 20),
    blendColor(ceoTheme.accent, 0xffffff, 0.2),
    blendColor(ceoTheme.wall, ceoTheme.accent, 0.45),
    0.7,
  );

  // CEO desk (centered horizontally, upper area)
  const deskW = 76;
  const deskH = 38;
  const cdx = ceoRoomX + Math.max(12, Math.round((ceoRoomW - deskW) / 2));
  const cdy = roomY + 46;
  const cdg = new Graphics();
  const deskEdge = isDark ? 0x3a2a18 : 0xb8925c;
  const deskTop = isDark ? 0x4a3828 : 0xd0a870;
  const monitorFrame = isDark ? 0x1a1a2a : 0x2a2a3a;
  const monitorScreen = isDark ? 0x2255aa : 0x4488cc;
  const namePlate = isDark ? 0x5a4820 : 0xe8c060;
  cdg.roundRect(cdx, cdy, deskW, deskH, 3).fill(deskEdge);
  cdg.roundRect(cdx + 1, cdy + 1, deskW - 2, deskH - 2, 2).fill(deskTop);
  const monX = cdx + Math.round((deskW - 30) / 2);
  cdg.roundRect(monX, cdy + 2, 30, 18, 2).fill(monitorFrame);
  cdg.roundRect(monX + 1.5, cdy + 3.5, 27, 14, 1).fill(monitorScreen);
  const plateW = 24;
  cdg.roundRect(cdx + Math.round((deskW - plateW) / 2), cdy + deskH - 12, plateW, 8, 2).fill(namePlate);
  ceoLayer.addChild(cdg);
  const ceoPlateText = new Text({
    text: "CEO",
    style: new TextStyle({ fontSize: 8, fill: 0x000000, fontWeight: "bold", fontFamily: OFFICE_FONT }),
  });
  ceoPlateText.anchor.set(0.5, 0.5);
  ceoPlateText.position.set(cdx + deskW / 2, cdy + deskH - 8);
  ceoLayer.addChild(ceoPlateText);
  drawChair(ceoLayer, cdx + deskW / 2, cdy + deskH + 12, 0xd4a860);

  // ── CEO room wall decorations ──
  drawPictureFrame(ceoLayer, ceoRoomX + 10, roomY + 24);
  wallClocksRef.current.push(drawWallClock(ceoLayer, ceoRoomX + ceoRoomW - 20, roomY + 40));

  // ── CEO room side furniture ──
  drawWaterCooler(ceoLayer, ceoRoomX + 12, roomY + 90);
  drawBookshelf(ceoLayer, ceoRoomX + ceoRoomW - 40, roomY + 92);

  // ── CEO room floor ──
  drawRug(ceoLayer, cdx + deskW / 2, cdy + deskH / 2 + 15, deskW + 36, deskH + 70, isDark ? 0x4a3020 : 0xc8a060);
  drawAmbientGlow(ceoLayer, ceoRoomX + ceoRoomW / 2, roomY + roomH / 2, ceoRoomW * 0.35, ceoTheme.accent, 0.08);
  drawAmbientGlow(ceoLayer, ceoRoomX + ceoRoomW / 2, roomY + roomH - 30, ceoRoomW * 0.2, ceoTheme.accent, 0.04);

  // ── CEO room bottom corners ──
  drawPlant(ceoLayer, ceoRoomX + 10, roomY + roomH - 26, 0);
  drawTrashCan(ceoLayer, ceoRoomX + 28, roomY + roomH - 14);
  drawPlant(ceoLayer, ceoRoomX + ceoRoomW - 14, roomY + roomH - 26, 2);


  /* ================================================================ */
  /*  ROOM 2 — Meeting Room (right)                                   */
  /* ================================================================ */
  drawRoomBase(ceoLayer, meetRoomX, roomY, meetRoomW, roomH, ceoTheme);
  drawRoomSign(ceoLayer, meetRoomX, roomY, meetRoomW, pickLocale(activeLocale, LOCALE_TEXT.meetingRoom), ceoTheme);

  // Ceiling lights + windows + bunting
  drawCeilingLight(ceoLayer, meetRoomX + meetRoomW / 3, roomY + 8, ceoTheme.accent);
  drawCeilingLight(ceoLayer, meetRoomX + (meetRoomW * 2) / 3, roomY + 8, ceoTheme.accent);
  drawWindow(ceoLayer, meetRoomX + 36, roomY + 24);
  drawWindow(ceoLayer, meetRoomX + meetRoomW - 36, roomY + 24);
  drawBunting(
    ceoLayer,
    meetRoomX + 10,
    roomY + 10,
    Math.max(60, meetRoomW - 20),
    blendColor(ceoTheme.accent, 0xffffff, 0.2),
    blendColor(ceoTheme.wall, ceoTheme.accent, 0.45),
    0.7,
  );

  // Meeting table (centered in meeting room)
  const mtW = Math.min(280, Math.max(120, Math.round(meetRoomW * 0.65)));
  const mtH = 28;
  const mtX = meetRoomX + Math.floor((meetRoomW - mtW) / 2);
  const mtY = roomY + 55;
  const mt = new Graphics();
  const tableEdge = isDark ? 0x2a2018 : 0xb89060;
  const tableTop = isDark ? 0x382818 : 0xd0a878;
  const tableInlay = isDark ? 0x4a3828 : 0xf7e4c0;
  mt.roundRect(mtX, mtY, mtW, mtH, 12).fill(tableEdge);
  mt.roundRect(mtX + 3, mtY + 3, mtW - 6, mtH - 6, 10).fill(tableTop);
  const inlayW = Math.min(92, Math.round(mtW * 0.4));
  const inlayX = mtX + Math.round((mtW - inlayW) / 2);
  mt.roundRect(inlayX, mtY + 8, inlayW, 12, 5).fill({ color: tableInlay, alpha: isDark ? 0.3 : 0.45 });
  if (activeMeetingTaskId && onOpenActiveMeetingMinutes) {
    mt.eventMode = "static";
    mt.cursor = "pointer";
    mt.on("pointerdown", () => {
      if (!activeMeetingTaskId) return;
      onOpenActiveMeetingMinutes(activeMeetingTaskId);
    });
  }
  ceoLayer.addChild(mt);

  // 8 chairs around table
  const chairMargin = Math.round(mtW / 4);
  const meetingSeatX = [mtX + chairMargin, mtX + Math.round(mtW / 2), mtX + mtW - chairMargin];
  for (const sx of meetingSeatX) {
    drawChair(ceoLayer, sx, mtY - 4, 0xc4a070);
    drawChair(ceoLayer, sx, mtY + mtH + 10, 0xc4a070);
  }
  const sideChairY = mtY + Math.round(mtH / 2);
  drawChair(ceoLayer, mtX - 10, sideChairY, 0xc4a070);
  drawChair(ceoLayer, mtX + mtW + 10, sideChairY, 0xc4a070);

  // Table label
  const meetingLabel = new Text({
    text: pickLocale(activeLocale, LOCALE_TEXT.collabTable),
    style: new TextStyle({
      fontSize: 9,
      fill: 0x3a2a10,
      fontWeight: "bold",
      fontFamily: OFFICE_FONT,
      letterSpacing: 1,
      dropShadow: { alpha: 0.2, distance: 1, blur: 1, color: 0xffffff },
    }),
  });
  meetingLabel.anchor.set(0.5, 0.5);
  meetingLabel.position.set(mtX + mtW / 2, mtY + mtH / 2);
  ceoLayer.addChild(meetingLabel);

  // Meeting seats ref (absolute positions for delivery animations)
  ceoMeetingSeatsRef.current = [
    { x: meetingSeatX[0], y: mtY + 2 },
    { x: meetingSeatX[1], y: mtY + 2 },
    { x: meetingSeatX[2], y: mtY + 2 },
    { x: meetingSeatX[0], y: mtY + mtH + 20 },
    { x: meetingSeatX[1], y: mtY + mtH + 20 },
    { x: meetingSeatX[2], y: mtY + mtH + 20 },
    { x: mtX - 10, y: sideChairY },
    { x: mtX + mtW + 10, y: sideChairY },
  ];

  // Update existing deliveries to new seat positions
  deliveriesRef.current = deliveriesRef.current.filter((delivery) => !delivery.sprite.destroyed);
  for (const delivery of deliveriesRef.current) {
    if (!delivery.holdAtSeat || typeof delivery.meetingSeatIndex !== "number") continue;
    const seat = ceoMeetingSeatsRef.current[delivery.meetingSeatIndex % ceoMeetingSeatsRef.current.length];
    if (!seat) continue;
    delivery.toX = seat.x;
    delivery.toY = seat.y;
    if (delivery.arrived) {
      delivery.sprite.position.set(seat.x, seat.y);
    } else {
      delivery.fromX = delivery.sprite.position.x;
      delivery.fromY = delivery.sprite.position.y;
      delivery.progress = 0;
    }
  }

  // ── Meeting room wall decorations ──
  drawPictureFrame(ceoLayer, meetRoomX + 14, roomY + 28);
  wallClocksRef.current.push(drawWallClock(ceoLayer, meetRoomX + 14, roomY + 46));
  drawWhiteboard(ceoLayer, meetRoomX + meetRoomW - 50, roomY + 28);

  // ── Meeting room floor area ──
  drawRug(ceoLayer, mtX + mtW / 2, mtY + mtH / 2, mtW + 44, mtH + 54, isDark ? 0x4a3020 : 0xc8a060);
  drawAmbientGlow(ceoLayer, meetRoomX + meetRoomW / 2, roomY + roomH / 2, meetRoomW * 0.35, ceoTheme.accent, 0.08);
  drawAmbientGlow(ceoLayer, meetRoomX + meetRoomW / 2, roomY + roomH - 30, meetRoomW * 0.2, ceoTheme.accent, 0.04);

  // ── Meeting room bottom decorations ──
  drawWaterCooler(ceoLayer, meetRoomX + 12, roomY + roomH - 48);
  drawBookshelf(ceoLayer, meetRoomX + 40, roomY + roomH - 38);
  drawPlant(ceoLayer, meetRoomX + 10, roomY + roomH - 26, 1);
  drawBookshelf(ceoLayer, meetRoomX + meetRoomW - 42, roomY + roomH - 38);
  drawTrashCan(ceoLayer, meetRoomX + meetRoomW - 18, roomY + roomH - 14);
  drawPlant(ceoLayer, meetRoomX + meetRoomW - 14, roomY + roomH - 26, 2);

  // Meeting hint text (conditional)
  if (activeMeetingTaskId) {
    const meetingHint = new Text({
      text: pickLocale(activeLocale, LOCALE_TEXT.meetingTableHint),
      style: new TextStyle({
        fontSize: 12,
        fill: 0x4a3518,
        fontWeight: "bold",
        fontFamily: OFFICE_FONT,
        dropShadow: { alpha: 0.15, distance: 1, blur: 1, color: 0xffffff },
      }),
    });
    meetingHint.anchor.set(1, 1);
    meetingHint.position.set(meetRoomX + meetRoomW - 8, roomY + roomH - 6);
    ceoLayer.addChild(meetingHint);
  }

  app.stage.addChild(ceoLayer);

  /* ── Hallway 1 (below CEO zone) ── */
  const hallY = CEO_ZONE_H;
  const hallG = new Graphics();
  const hallBase = isDark ? 0x252535 : 0xe8dcc8;
  const hallTile1 = isDark ? 0x2d2d40 : 0xf0e4d0;
  const hallTile2 = isDark ? 0x1f1f30 : 0xe8dcc8;
  const hallDash = isDark ? 0x3a3858 : 0xc8b898;
  const hallTrim = isDark ? 0x3a3858 : 0xd4c4a8;
  const hallGlow = isDark ? 0x3355bb : 0xfff8e0;
  hallG.rect(4, hallY, OFFICE_W - 8, HALLWAY_H).fill(hallBase);
  drawBandGradient(hallG, 4, hallY, OFFICE_W - 8, HALLWAY_H, hallTile1, hallTile2, 5, 0.38);
  for (let dx = 4; dx < OFFICE_W - 4; dx += TILE * 2) {
    hallG.rect(dx, hallY, TILE * 2, HALLWAY_H).fill({ color: hallTile1, alpha: 0.5 });
    hallG.rect(dx + TILE * 2, hallY, TILE * 2, HALLWAY_H).fill({ color: hallTile2, alpha: 0.3 });
  }
  for (let dx = 20; dx < OFFICE_W - 20; dx += 16) {
    hallG.rect(dx, hallY + HALLWAY_H / 2, 6, 1).fill({ color: hallDash, alpha: 0.4 });
  }
  hallG.rect(4, hallY, OFFICE_W - 8, 1.5).fill({ color: hallTrim, alpha: 0.5 });
  hallG.rect(4, hallY + HALLWAY_H - 1.5, OFFICE_W - 8, 1.5).fill({ color: hallTrim, alpha: 0.5 });
  hallG
    .ellipse(OFFICE_W / 2, hallY + HALLWAY_H / 2 + 1, Math.max(120, OFFICE_W * 0.28), 6)
    .fill({ color: hallGlow, alpha: isDark ? 0.06 : 0.08 });

  /* ── Hallway 2 (above break room) ── */
  const hall2Y = breakRoomY - HALLWAY_H;
  hallG.rect(4, hall2Y, OFFICE_W - 8, HALLWAY_H).fill(hallBase);
  drawBandGradient(hallG, 4, hall2Y, OFFICE_W - 8, HALLWAY_H, hallTile1, hallTile2, 5, 0.38);
  for (let dx = 4; dx < OFFICE_W - 4; dx += TILE * 2) {
    hallG.rect(dx, hall2Y, TILE * 2, HALLWAY_H).fill({ color: hallTile1, alpha: 0.5 });
    hallG.rect(dx + TILE * 2, hall2Y, TILE * 2, HALLWAY_H).fill({ color: hallTile2, alpha: 0.3 });
  }
  for (let dx = 20; dx < OFFICE_W - 20; dx += 16) {
    hallG.rect(dx, hall2Y + HALLWAY_H / 2, 6, 1).fill({ color: hallDash, alpha: 0.4 });
  }
  hallG.rect(4, hall2Y, OFFICE_W - 8, 1.5).fill({ color: hallTrim, alpha: 0.5 });
  hallG.rect(4, hall2Y + HALLWAY_H - 1.5, OFFICE_W - 8, 1.5).fill({ color: hallTrim, alpha: 0.5 });
  hallG
    .ellipse(OFFICE_W / 2, hall2Y + HALLWAY_H / 2 + 1, Math.max(120, OFFICE_W * 0.28), 6)
    .fill({ color: hallGlow, alpha: isDark ? 0.06 : 0.08 });

  app.stage.addChild(hallG);
  drawPlant(app.stage as Container, 30, hallY + HALLWAY_H - 6, 2);
  drawPlant(app.stage as Container, OFFICE_W - 30, hallY + HALLWAY_H - 6, 1);

  /* ── Hint text centered in Hallway 1 ── */
  const hallCY = hallY + HALLWAY_H / 2;
  const hintText = new Text({
    text: pickLocale(activeLocale, LOCALE_TEXT.hint),
    style: new TextStyle({
      fontSize: 9,
      fill: isDark ? 0xd0c8b8 : 0x5a4020,
      fontFamily: OFFICE_FONT,
      dropShadow: { alpha: 0.1, distance: 1, blur: 1, color: isDark ? 0x000000 : 0xffffff },
    }),
  });
  hintText.anchor.set(0.5, 0.5);
  hintText.position.set(OFFICE_W / 2, hallCY);
  app.stage.addChild(hintText);
}
