# Observatory Layout Constants — Raw Transcription

Source: `Classes/EOClock.h` (lines 14–17) and `Classes/EOClock.mm` (lines 1380–1721), `initializeConstantsForOrientation:`.

**Basis for portrait-normalised column:**
- Values used as X-positions or widths → divided by `EOSCREENWIDTH` (768).
- Values used as Y-positions or heights → divided by `EOSCREENHEIGHT` (1024).
- Radii, font sizes, update intervals, and colours are left blank (N/A) in that column.
- The basis used is noted in each row cell as `768` or `1024`.

## 1. Preprocessor Defines (EOClock.h)

| Name | Portrait value | Landscape value | Source line | Comment |
|------|---------------|-----------------|-------------|---------|
| `EOSCREENWIDTH` | 768 | 768 | EOClock.h:14 | |
| `EOSCREENHEIGHT` | 1024 | 1024 | EOClock.h:15 | |
| `EOSTATICSTATUSBARHEIGHT` | 20 | 20 | EOClock.h:17 | |

## 2. Orientation-Independent Constants (set before orientation branch)

These are assigned once at the top of `initializeConstantsForOrientation:` and may be **overridden** later inside the portrait or landscape blocks. Where an override happens, the final value is listed in the orientation-specific tables below instead.

| Name | Portrait value | Landscape value | Normalised portrait | Source line | Comment |
|------|---------------|-----------------|---------------------|-------------|---------|
| `headerLineWidth` | 2 | 2 | — | 1521 | |
| `bmw` | 300 | 300 | 300/768 ≈ 0.3906 (768) | 1522 | |
| `bmh` | `bmw/2` = 150 | `bmw/2` = 150 | 150/1024 ≈ 0.1465 (1024) | 1523 | |
| `headerHeight` | `bmh` = 150 | `bmh` = 150 | 150/1024 ≈ 0.1465 (1024) | 1524 | |
| `dateH` | `headerHeight/2` = 75 | `headerHeight/2` = 75 | 75/1024 ≈ 0.0732 (1024) | 1525 | |
| `dateW` | `EOSCREENWIDTH/2 - (bmw/2 + headerLineWidth*3)` = 228 | `EOSCREENWIDTH/2 - (bmw/2 + headerLineWidth*3)` = 228 | 228/768 ≈ 0.2969 (768) | 1526 | `384 - (150 + 6)` |
| `ChandraR` | `bmh/2` = 75 | `bmh/2` = 75 | — | 1527 | |
| `mainR` | 365 | 365 | — | 1528 | |
| `NTPStatusSize` | 12 | 12 | — | 1529 | |
| `NTPStatusX` | See override below | See override below | — | 1530 | Overridden in both orientations |
| `NTPStatusY` | See override below | See override below | — | 1531 | Overridden in both orientations |
| `tzW` | 150 | 150 | 150/768 ≈ 0.1953 (768) | 1532 | |
| `tzX` | 0 | 0 | 0.0 (768) | 1533 | |
| `tzY` | -272 | See override below | -272/1024 ≈ -0.2656 (1024) | 1534 | Landscape: `tzY += (headerHeight + headerLineWidth*2) / 2` at line 1602 |
| `advButtonWidth` | 45 | 45 | 45/768 ≈ 0.0586 (768) | 1535 | |
| `advButtonHeight` | 40 | 40 | 40/1024 ≈ 0.0391 (1024) | 1536 | |
| `advMinuteButtonOffsetX` | `-advButtonWidth` = -45 | `-advButtonWidth` = -45 | -45/768 ≈ -0.0586 (768) | 1537 | |
| `advHourButtonOffsetX` | `-advButtonWidth*2` = -90 | `-advButtonWidth*2` = -90 | -90/768 ≈ -0.1172 (768) | 1538 | |
| `advDayButtonOffsetX` | `-advButtonWidth*3` = -135 | `-advButtonWidth*3` = -135 | -135/768 ≈ -0.1758 (768) | 1539 | |
| `advPhaseButtonOffsetX` | `-advButtonWidth*4` = -180 | `-advButtonWidth*4` = -180 | -180/768 ≈ -0.2344 (768) | 1540 | |
| `advMonthButtonOffsetX` | `-advButtonWidth*5` = -225 | `-advButtonWidth*5` = -225 | -225/768 ≈ -0.2930 (768) | 1541 | |
| `advYearButtonOffsetX` | `-advButtonWidth*6` = -270 | `-advButtonWidth*6` = -270 | -270/768 ≈ -0.3516 (768) | 1542 | |
| `advCentButtonOffsetX` | `-advButtonWidth*7` = -315 | `-advButtonWidth*7` = -315 | -315/768 ≈ -0.4102 (768) | 1543 | |
| `backMinuteButtonOffsetX` | `advButtonWidth` = 45 | `advButtonWidth` = 45 | 45/768 ≈ 0.0586 (768) | 1544 | |
| `backHourButtonOffsetX` | `advButtonWidth*2` = 90 | `advButtonWidth*2` = 90 | 90/768 ≈ 0.1172 (768) | 1545 | |
| `backDayButtonOffsetX` | `advButtonWidth*3` = 135 | `advButtonWidth*3` = 135 | 135/768 ≈ 0.1758 (768) | 1546 | |
| `backPhaseButtonOffsetX` | `advButtonWidth*4` = 180 | `advButtonWidth*4` = 180 | 180/768 ≈ 0.2344 (768) | 1547 | |
| `backMonthButtonOffsetX` | `advButtonWidth*5` = 225 | `advButtonWidth*5` = 225 | 225/768 ≈ 0.2930 (768) | 1548 | |
| `backYearButtonOffsetX` | `advButtonWidth*6` = 270 | `advButtonWidth*6` = 270 | 270/768 ≈ 0.3516 (768) | 1549 | |
| `backCentButtonOffsetX` | `advButtonWidth*7` = 315 | `advButtonWidth*7` = 315 | 315/768 ≈ 0.4102 (768) | 1550 | |

## 3. Portrait-Specific Constants (lines 1551–1591)

| Name | Portrait value | Landscape value | Normalised portrait | Source line | Comment |
|------|---------------|-----------------|---------------------|-------------|---------|
| `advButtonX` | 0 | 0 | 0.0 (768) | 1552 | Also set to 0 in landscape (line 1593) |
| `advButtonY` | 327 | 347 | 327/1024 ≈ 0.3193 (1024) | 1553 | |
| `fullWidth` | 768 | 1024 | 1.0 (768) | 1554 | |
| `fullHeight` | 1024 | 768 | 1.0 (1024) | 1555 | |
| `mainX` | 0 | 0 | 0.0 (768) | 1556 | Landscape: `0` at line 1597; comment: `// use "-(headerHeight + headerLineWidth*2) / 2" for same position relative to Home button` |
| `mainY` | `-(headerHeight + headerLineWidth*2) / 2` = -77 | -13 | -77/1024 ≈ -0.0752 (1024) | 1557 | |
| `ringMasterScale` | 1.0 | 0.9 | — | 1558 | |
| `moonMasterScale` | 1.0 | 1.2 | — | 1559 | |
| `earthMasterScale` | 1.0 | 0.9 | — | 1560 | |
| `NTPStatusY` | `-502 + NTPStatusSize` = -490 | `-(EOSCREENWIDTH-EOSTATICSTATUSBARHEIGHT)/2 + NTPStatusSize` = -362 | -490/1024 ≈ -0.4785 (1024) | 1561 | Overrides line 1531 |
| `NTPStatusX` | `-384 + NTPStatusSize` = -372 | `-EOSCREENHEIGHT/2 + NTPStatusSize` = -500 | -372/768 ≈ -0.4844 (768) | 1562 | Overrides line 1530 |
| `logoX` | 0 | 0 | 0.0 (768) | 1563 | |
| `logoY` | `-(EOSCREENHEIGHT-EOSTATICSTATUSBARHEIGHT-19)/2` = -492.5 | `-(EOSCREENWIDTH-EOSTATICSTATUSBARHEIGHT-19)/2 + 2` = -362.5 | -492.5/1024 ≈ -0.4809 (1024) | 1564 | Portrait: `= -(1024-20-19)/2`. Landscape: `= -(768-20-19)/2 + 2` at line 1607 (commented-out alternate at 1606: `//logoY = -EOSCREENWIDTH/2 + logoH + 5;`) |
| `BMX` | 0 | `EOSCREENHEIGHT/2 - bmw*earthMasterScale/2 - headerLineWidth` = 375 | 0.0 (768) | 1565 | |
| `ChandraY` | `(EOSCREENHEIGHT-EOSTATICSTATUSBARHEIGHT)/2 - (ChandraR) - headerLineWidth -1` = 424 | `EOSCREENWIDTH/2 - EOSTATICSTATUSBARHEIGHT - ChandraR - 55 + EOSTATICSTATUSBARHEIGHT` = 254 | 424/1024 ≈ 0.4141 (1024) | 1566 | Portrait: `= (1024-20)/2 - 75 - 2 - 1`. Landscape: `= 384 - 20 - 75 - 55 + 20` at line 1611 |
| `BMY` | `ChandraY` = 424 | `EOSCREENWIDTH/2 - bmh*earthMasterScale/2 - EOSTATICSTATUSBARHEIGHT/2 - 2` = 304.5 | 424/1024 ≈ 0.4141 (1024) | 1567 | |
| `ChandraX` | `-EOSCREENWIDTH/2 + (EOSCREENWIDTH-bmw)/4` = -267 | `-EOSCREENHEIGHT/2 + ChandraR + 55` = -382 | -267/768 ≈ -0.3477 (768) | 1568 | Portrait: `= -384 + (768-300)/4`. Landscape: `= -512 + 75 + 55` at line 1610 |
| `bdX` | `bmw/2+dateW/2+headerLineWidth*2` = 268 | `-bdX2` = 333 | 268/768 ≈ 0.3490 (768) | 1569 | Landscape: at line 1614 |
| `bdY` | `BMY+headerHeight/4-headerLineWidth` = 459.5 | `bdY2` = -346.5 | 459.5/1024 ≈ 0.4487 (1024) | 1570 | Landscape: at line 1615 |
| `bdX2` | `bmw/2+dateW/2+headerLineWidth*2` = 268 | -333 | 268/768 ≈ 0.3490 (768) | 1571 | Portrait: identical to `bdX`. Landscape: hardcoded at line 1612 |
| `bdY2` | `BMY-headerHeight/4+headerLineWidth` = 388.5 | `-EOSCREENWIDTH/2 + dateH/2` = -346.5 | 388.5/1024 ≈ 0.3794 (1024) | 1572 | Landscape: at line 1613 |
| `bdX3` | `bdX` = 268 | `bdX` = 333 | 268/768 ≈ 0.3490 (768) | 1573 | |
| `bdY3` | `BMY` = 424 | `bdY+24+10.5` = -312 | 424/1024 ≈ 0.4141 (1024) | 1574 | |
| `bdX4` | `bdX+90` = 358 | `bdX+65` = 398 | 358/768 ≈ 0.4661 (768) | 1575 | |
| `extDialOffX` | 305 | 420 | 305/768 ≈ 0.3971 (768) | 1576 | |
| `extDialOffY` | 348 | 50 | 348/1024 ≈ 0.3398 (1024) | 1577 | |
| `altX` | `mainX-extDialOffX` = -305 | `mainX-extDialOffX` = -420 | -305/768 ≈ -0.3971 (768) | 1578 | |
| `altY` | `mainY+extDialOffY` = 271 | `mainY+extDialOffY` = 37 | 271/1024 ≈ 0.2646 (1024) | 1579 | |
| `azX` | `mainX-extDialOffX` = -305 | `mainX-extDialOffX` = -420 | -305/768 ≈ -0.3971 (768) | 1580 | |
| `azY` | `mainY-extDialOffY` = -425 | `mainY-extDialOffY*3.5` = -188 | -425/1024 ≈ -0.4150 (1024) | 1581 | ⚠ Landscape uses `*3.5` on line 1628 |
| `eclipseX` | `mainX+extDialOffX` = 305 | `mainX+extDialOffX` = 420 | 305/768 ≈ 0.3971 (768) | 1582 | |
| `eclipseY` | `mainY+extDialOffY` = 271 | `mainY+extDialOffY` = 37 | 271/1024 ≈ 0.2646 (1024) | 1583 | |
| `EOTX` | `mainX+extDialOffX` = 305 | `mainX+extDialOffX` = 420 | 305/768 ≈ 0.3971 (768) | 1584 | |
| `EOTY` | `mainY-extDialOffY` = -425 | `mainY-extDialOffY*3.5` = -188 | -425/1024 ≈ -0.4150 (1024) | 1585 | ⚠ Landscape uses `*3.5` on line 1630 |
| `fDSTX` | `mainX-142` = -142 | `mainX-127` = -127 | -142/768 ≈ -0.1849 (768) | 1586 | |
| `fDSTY` | `mainY-341` = -418 | `mainY-306` = -319 | -418/1024 ≈ -0.4082 (1024) | 1587 | |
| `sDSTX` | `mainX-225` = -225 | `mainX-200` = -200 | -225/768 ≈ -0.2930 (768) | 1588 | |
| `sDSTY` | `mainY-292` = -369 | `mainY-262` = -275 | -369/1024 ≈ -0.3604 (1024) | 1589 | |
| `resetX` | `BMX` = 0 | 0 | 0.0 (768) | 1590 | |
| `resetY` | `BMY-headerHeight/2-22` = 327 | `EOSCREENWIDTH/2 - EOSTATICSTATUSBARHEIGHT - 17` = 347 | 327/1024 ≈ 0.3193 (1024) | 1591 | |

## 4. Landscape-Specific Constants (lines 1592–1634)

Constants already listed above with their landscape values; the following are landscape-only structural notes.

### Lines 1603–1611 (overrides or landscape-only values)

| Name | Portrait value | Landscape value | Normalised portrait | Source line | Comment |
|------|---------------|-----------------|---------------------|-------------|---------|
| `tzY` (landscape adjusted) | -272 | `-272 + (headerHeight+headerLineWidth*2)/2` = -195 | -272/1024 ≈ -0.2656 (1024) | 1602 | `+= (headerHeight + headerLineWidth*2) / 2` = `+77` |
| `NTPStatusY` (landscape) | -490 | `-(EOSCREENWIDTH-EOSTATICSTATUSBARHEIGHT)/2 + NTPStatusSize` = -362 | — | 1603 | |
| `NTPStatusX` (landscape) | -372 | `-EOSCREENHEIGHT/2 + NTPStatusSize` = -500 | — | 1604 | |
| `logoY` (landscape) | -492.5 | `-(EOSCREENWIDTH-EOSTATICSTATUSBARHEIGHT-19)/2 + 2` = -362.5 | — | 1607 | Commented-out: `//logoY = -EOSCREENWIDTH/2 + logoH + 5;` at line 1606 |
| `BMX` (landscape) | 0 | `EOSCREENHEIGHT/2 - bmw*earthMasterScale/2 - headerLineWidth` = 375 | — | 1608 | |
| `BMY` (landscape) | 424 | `EOSCREENWIDTH/2 - bmh*earthMasterScale/2 - EOSTATICSTATUSBARHEIGHT/2 - 2` = 304.5 | — | 1609 | |
| `ChandraX` (landscape) | -267 | `-EOSCREENHEIGHT/2 + ChandraR + 55` = -382 | — | 1610 | |
| `ChandraY` (landscape) | 424 | `EOSCREENWIDTH/2 - EOSTATICSTATUSBARHEIGHT - ChandraR - 55 + EOSTATICSTATUSBARHEIGHT` = 254 | — | 1611 | Note: `-EOSTATICSTATUSBARHEIGHT` and `+EOSTATICSTATUSBARHEIGHT` cancel; simplifies to `384 - 75 - 55` |
| `bdX2` (landscape) | 268 | -333 | — | 1612 | Hardcoded magic number |
| `bdY2` (landscape) | 388.5 | `-EOSCREENWIDTH/2 + dateH/2` = -346.5 | — | 1613 | |
| `bdX` (landscape) | 268 | `-bdX2` = 333 | — | 1614 | |
| `bdY` (landscape) | 459.5 | `bdY2` = -346.5 | — | 1615 | |
| `bdX3` (landscape) | 268 | `bdX` = 333 | — | 1616 | |
| `bdY3` (landscape) | 424 | `bdY+24+10.5` = -312 | — | 1617 | |
| `bdX4` (landscape) | 358 | `bdX+65` = 398 | — | 1618 | |
| `extDialOffX` (landscape) | 305 | 420 | — | 1619 | |
| `extDialOffY` (landscape) | 348 | 50 | — | 1620 | |
| `fDSTX` (landscape) | -142 | `mainX-127` = -127 | — | 1621 | |
| `fDSTY` (landscape) | -418 | `mainY-306` = -319 | — | 1622 | |
| `sDSTX` (landscape) | -225 | `mainX-200` = -200 | — | 1623 | |
| `sDSTY` (landscape) | -369 | `mainY-262` = -275 | — | 1624 | |
| `altX` (landscape) | -305 | `mainX-extDialOffX` = -420 | — | 1625 | |
| `altY` (landscape) | 271 | `mainY+extDialOffY` = 37 | — | 1626 | |
| `azX` (landscape) | -305 | `mainX-extDialOffX` = -420 | — | 1627 | |
| `azY` (landscape) | -425 | `mainY-extDialOffY*3.5` = -188 | — | 1628 | ⚠ `*3.5` differs from portrait `*1` |
| `EOTX` (landscape) | 305 | `mainX+extDialOffX` = 420 | — | 1629 | |
| `EOTY` (landscape) | -425 | `mainY-extDialOffY*3.5` = -188 | — | 1630 | ⚠ `*3.5` differs from portrait `*1` |
| `eclipseX` (landscape) | 305 | `mainX+extDialOffX` = 420 | — | 1631 | |
| `eclipseY` (landscape) | 271 | `mainY+extDialOffY` = 37 | — | 1632 | |
| `resetX` (landscape) | 0 | 0 | — | 1633 | |
| `resetY` (landscape) | 327 | `EOSCREENWIDTH/2 - EOSTATICSTATUSBARHEIGHT - 17` = 347 | — | 1634 | |

## 5. Post-Orientation Constants (lines 1636–1721)

These are assigned after the `if/else` block and use the orientation-dependent values above to compute final values.

### 5a. Update intervals

| Name | Value | Source line | Comment |
|------|-------|-------------|---------|
| `riseSetUpdate` | 3600 | 1639 | |
| `planetUpdate` | 3600 | 1640 | |
| `eclipseUpdate` | 30 | 1641 | |
| `blueMarbleUpdate` | 60 | 1642 | |
| `moonViewUpdate` | 60 | 1643 | |
| `extHandUpdate` | 60 | 1644 | |

### 5b. Sizes, radii, and offsets

| Name | Portrait value | Landscape value | Normalised portrait | Source line | Comment |
|------|---------------|-----------------|---------------------|-------------|---------|
| `logoH` | 29 | 29 | 29/1024 ≈ 0.0283 (1024) | 1646 | |
| `mainFontSize` | 32 | 32 | — | 1647 | |
| `zodiacFontSize` | 36 | 36 | — | 1648 | |
| `smallZodiacFontSize` | 11 | 11 | — | 1649 | |
| `tickHeight` | `mainFontSize/2.5` = 12.8 | `mainFontSize/2.5` = 12.8 | — | 1650 | |
| `plR` | `mainR-mainFontSize-1` = 332 | `mainR-mainFontSize-1` = 332 | — | 1651 | `= 365-32-1` |
| `sunRingWidth` | 64 | 64 | — | 1652 | |
| `subdialFontSize` | 10 | 10 | — | 1653 | |
| `orbitInc` | 40 | 40 | — | 1654 | |
| `subOffset` | 149 | 149 | — | 1655 | `// == earth Radius; approximately (plR - sunRingWidth)/4` |
| `subR` | `(orbitInc - 1) * 2 - 5` = 73 | `(orbitInc - 1) * 2 - 5` = 73 | — | 1656 | `= 39*2-5` |
| `sunD` | 100 | 100 | — | 1657 | |
| `zD` | 526 | 526 | — | 1658 | |
| `zR` | `plR-60` = 272 | `plR-60` = 272 | — | 1674 | |
| `plR2` | `plR - 52 - 26` = 254 | `plR - 52 - 26` = 254 | — | 1675 | `= 332-52-26` |
| `extDialR` | 60 | 60 | — | 1702 | |
| `extFontSize` | 10 | 10 | — | 1704 | |
| `yearFontSize` | 20 | 20 | — | 1705 | |
| `eclipseFontSize` | 10 | 10 | — | 1706 | |
| `eclipseHorizonFontSize` | 10 | 10 | — | 1707 | |
| `altR` | `extDialR` = 60 | `extDialR` = 60 | — | 1708 | |
| `azR` | `altR` = 60 | `altR` = 60 | — | 1709 | |
| `eclipseR2` | `altR + 3` = 63 | `altR + 3` = 63 | — | 1710 | |
| `eclipseR1` | `eclipseR2 - 14` = 49 | `eclipseR2 - 14` = 49 | — | 1711 | |
| `demoButtonOffsetY` | `eclipseR2 + 15` = 78 | `eclipseR2 + 15` = 78 | — | 1712 | |
| `EOTR` | `altR` = 60 | `altR` = 60 | — | 1713 | |
| `EOTFontSize` | 8 | 8 | — | 1714 | |
| `planetW` | 50 | 50 | — | 1715 | |
| `planetH` | 15 | 15 | — | 1716 | |

### 5c. Orientation-dependent positions (computed after branch)

| Name | Portrait value | Landscape value | Normalised portrait | Source line | Comment |
|------|---------------|-----------------|---------------------|-------------|---------|
| `EVX` | `BMX + centerX` | `BMX + centerX` | — | 1636 | `centerX` is not defined in this method; likely a class member |
| `EVY` | `BMY + centerY` | `BMY + centerY` | — | 1637 | `centerY` is not defined in this method; likely a class member |
| `UTCX` | `mainX` = 0 | `mainX` = 0 | 0.0 (768) | 1660 | |
| `UTCY` | `mainY+subOffset*ringMasterScale` = -77 + 149×1.0 = 72 | `mainY+subOffset*ringMasterScale` = -13 + 149×0.9 = 121.1 | 72/1024 ≈ 0.0703 (1024) | 1661 | |
| `utcdayX` | `mainX` = 0 | `mainX` = 0 | 0.0 (768) | 1662 | |
| `utcdayY` | `UTCY - 39` = 33 | `UTCY - 39` = 82.1 | 33/1024 ≈ 0.0322 (1024) | 1663 | |
| `solarX` | `mainX -subOffset*ringMasterScale * cos(pi/6)` = -129.04… | `mainX -subOffset*ringMasterScale * cos(pi/6)` = -116.13… | ≈ -0.1680 (768) | 1664 | `= -149*1.0*0.8660…` (portrait). Landscape: `= -149*0.9*0.8660…` |
| `solarY` | `mainY -subOffset*ringMasterScale * sin(pi/6)` = -151.5 | `mainY -subOffset*ringMasterScale * sin(pi/6)` = -80.05 | ≈ -0.1480 (1024) | 1665 | `= -77 - 149*1.0*0.5` (portrait). Landscape: `= -13 - 149*0.9*0.5` |
| `sidX` | `-solarX` = 129.04… | `-solarX` = 116.13… | ≈ 0.1680 (768) | 1666 | |
| `sidY` | `solarY` = -151.5 | `solarY` = -80.05 | ≈ -0.1480 (1024) | 1667 | |
| `eclipseStatusX` | `eclipseX` = 305 | `eclipseX` = 420 | ≈ 0.3971 (768) | 1669 | |
| `eclipseStatusY` | `eclipseY` = 271 | `eclipseY` = 37 | ≈ 0.2646 (1024) | 1670 | |
| `eclipseHorizonX` | `eclipseX` = 305 | `eclipseX` = 420 | ≈ 0.3971 (768) | 1671 | |
| `eclipseHorizonY` | `eclipseY` = 271 | `eclipseY` = 37 | ≈ 0.2646 (1024) | 1672 | |

### 5d. Hand/sun/rise-set lengths and arrows

| Name | Portrait value | Landscape value | Source line | Comment |
|------|---------------|-----------------|-------------|---------|
| `h24Len` | `mainR-tickHeight*.37` = 360.264 | `mainR-tickHeight*.37` = 360.264 | 1677 | `= 365-12.8*0.37` |
| `h24Wid` | `h24Arrow/1.8/sqrt(3)` ≈ 8.018 | `h24Arrow/1.8/sqrt(3)` ≈ 8.018 | 1678 | Where `h24Arrow=25` (line 1689) |
| `minLen` | `zR - zodiacFontSize/2` = 254 | `zR - zodiacFontSize/2` = 254 | 1679 | `= 272 - 18` |
| `h12Len` | `minLen *.75` = 190.5 | `minLen *.75` = 190.5 | 1680 | |
| `secLen` | `minLen * 1.05` = 266.7 | `minLen * 1.05` = 266.7 | 1681 | |
| `sunRiseSetLen` | `h24Len` = 360.264 | `h24Len` = 360.264 | 1682 | `//plR + 52 - sunRingWidth;` (commented-out alternate formula) |
| `sunRiseSetWidth` | 1 | 1 | 1683 | |
| `sunRiseSetArrow` | 18 | 18 | 1684 | |
| `alarmTailR` | 8 | 8 | 1685 | |
| `alarmLen` | `mainR+alarmTailR*2+1` = 382 | `mainR+alarmTailR*2+1` = 382 | 1686 | `= 365+16+1` |
| `alarmLen2` | `mainR+alarmTailR*2+1` = 382 | `mainR+alarmTailR*2+1` = 382 | 1687 | Identical to `alarmLen` |
| `alarmArrow` | 0 | 0 | 1688 | |
| `h24Arrow` | 25 | 25 | 1689 | |
| `len2` | `zR-5` = 267 | `zR-5` = 267 | 1690 | `= 272-5` |

### 5e. Colours (orientation-independent)

| Name | Value (RGB) | Source line | Comment |
|------|-------------|-------------|---------|
| `hour24Color` | `(1.0, 1.0, 1.0, 0.85)` | 1691 | |
| `hour12Color` | `(250/256, 183/256, 0.0, 1.0)` | 1692 | |
| `minuteColor` | `(1.0, 193/256, 37/256, 1.0)` | 1693 | |
| `secondColor` | `(1.0, 217/256, 154/256, 1.0)` | 1694 | |
| `alarmColor` | `(1.0, 0.0, 0.0, 1.0)` | 1695 | |
| `snoonColor` | `(1.0, 1.0, 0.0, 0.75)` | 1696 | |
| `smidColor` | `(0.0, 0.0, 1.0, 0.75)` | 1697 | |
| `risesetColor` | `(1.0, 0.50, 0.00, 0.75)` | 1698 | |
| `goldenColor` | `(1.0, 0.80, 0.00, 0.75)` | 1699 | |
| `twilightColor` | `(0.0, 0.50, 0.50, 0.75)` | 1700 | |
| `twilightArmColor` | `(0.3, 0.60, 0.60, 1.0)` | 1701 | |
| `fwdColor` | `(0.75, 0.0, 0.0, 1.0)` | 1718 | |
| `bckColor` | `(0.0, 0.75, 1.0, 1.0)` | 1719 | |

## 6. Derived Constants

Constants whose value is expressed as a formula of other constants (N.B.: this records the source formulae, not numeric values; see tables above for numeric evaluations).

| Derived constant | Formula | Source line |
|------------------|---------|-------------|
| `bmh` | `bmw / 2` | 1523 |
| `headerHeight` | `bmh` | 1524 |
| `dateH` | `headerHeight / 2` | 1525 |
| `dateW` | `EOSCREENWIDTH/2 - (bmw/2 + headerLineWidth*3)` | 1526 |
| `ChandraR` | `bmh / 2` | 1527 |
| `NTPStatusX` (base) | `-EOSCREENWIDTH/2 + NTPStatusSize` | 1530 |
| `NTPStatusY` (base) | `-(EOSCREENHEIGHT-EOSTATICSTATUSBARHEIGHT)/2 + NTPStatusSize` | 1531 |
| `advMinuteButtonOffsetX` | `-advButtonWidth` | 1537 |
| `advHourButtonOffsetX` | `-advButtonWidth * 2` | 1538 |
| `advDayButtonOffsetX` | `-advButtonWidth * 3` | 1539 |
| `advPhaseButtonOffsetX` | `-advButtonWidth * 4` | 1540 |
| `advMonthButtonOffsetX` | `-advButtonWidth * 5` | 1541 |
| `advYearButtonOffsetX` | `-advButtonWidth * 6` | 1542 |
| `advCentButtonOffsetX` | `-advButtonWidth * 7` | 1543 |
| `backMinuteButtonOffsetX` | `advButtonWidth` | 1544 |
| `backHourButtonOffsetX` | `advButtonWidth * 2` | 1545 |
| `backDayButtonOffsetX` | `advButtonWidth * 3` | 1546 |
| `backPhaseButtonOffsetX` | `advButtonWidth * 4` | 1547 |
| `backMonthButtonOffsetX` | `advButtonWidth * 5` | 1548 |
| `backYearButtonOffsetX` | `advButtonWidth * 6` | 1549 |
| `backCentButtonOffsetX` | `advButtonWidth * 7` | 1550 |
| `mainY` (portrait) | `-(headerHeight + headerLineWidth*2) / 2` | 1557 |
| `NTPStatusY` (portrait) | `-502 + NTPStatusSize` | 1561 |
| `NTPStatusX` (portrait) | `-384 + NTPStatusSize` | 1562 |
| `logoY` (portrait) | `-(EOSCREENHEIGHT-EOSTATICSTATUSBARHEIGHT-19)/2` | 1564 |
| `ChandraY` (portrait) | `(EOSCREENHEIGHT-EOSTATICSTATUSBARHEIGHT)/2 - ChandraR - headerLineWidth - 1` | 1566 |
| `BMY` (portrait) | `ChandraY` | 1567 |
| `ChandraX` (portrait) | `-EOSCREENWIDTH/2 + (EOSCREENWIDTH-bmw)/4` | 1568 |
| `bdX` (portrait) | `bmw/2 + dateW/2 + headerLineWidth*2` | 1569 |
| `bdY` (portrait) | `BMY + headerHeight/4 - headerLineWidth` | 1570 |
| `bdX2` (portrait) | `bmw/2 + dateW/2 + headerLineWidth*2` (same as `bdX`) | 1571 |
| `bdY2` (portrait) | `BMY - headerHeight/4 + headerLineWidth` | 1572 |
| `bdX3` (portrait) | `bdX` | 1573 |
| `bdY3` (portrait) | `BMY` | 1574 |
| `bdX4` (portrait) | `bdX + 90` | 1575 |
| `altX` (portrait) | `mainX - extDialOffX` | 1578 |
| `altY` (portrait) | `mainY + extDialOffY` | 1579 |
| `azX` (portrait) | `mainX - extDialOffX` | 1580 |
| `azY` (portrait) | `mainY - extDialOffY` | 1581 |
| `eclipseX` (portrait) | `mainX + extDialOffX` | 1582 |
| `eclipseY` (portrait) | `mainY + extDialOffY` | 1583 |
| `EOTX` (portrait) | `mainX + extDialOffX` | 1584 |
| `EOTY` (portrait) | `mainY - extDialOffY` | 1585 |
| `fDSTX` (portrait) | `mainX - 142` | 1586 |
| `fDSTY` (portrait) | `mainY - 341` | 1587 |
| `sDSTX` (portrait) | `mainX - 225` | 1588 |
| `sDSTY` (portrait) | `mainY - 292` | 1589 |
| `resetX` (portrait) | `BMX` | 1590 |
| `resetY` (portrait) | `BMY - headerHeight/2 - 22` | 1591 |
| `tzY` (landscape) | `tzY_base + (headerHeight + headerLineWidth*2) / 2` | 1602 |
| `NTPStatusY` (landscape) | `-(EOSCREENWIDTH-EOSTATICSTATUSBARHEIGHT)/2 + NTPStatusSize` | 1603 |
| `NTPStatusX` (landscape) | `-EOSCREENHEIGHT/2 + NTPStatusSize` | 1604 |
| `logoY` (landscape) | `-(EOSCREENWIDTH-EOSTATICSTATUSBARHEIGHT-19)/2 + 2` | 1607 |
| `BMX` (landscape) | `EOSCREENHEIGHT/2 - bmw*earthMasterScale/2 - headerLineWidth` | 1608 |
| `BMY` (landscape) | `EOSCREENWIDTH/2 - bmh*earthMasterScale/2 - EOSTATICSTATUSBARHEIGHT/2 - 2` | 1609 |
| `ChandraX` (landscape) | `-EOSCREENHEIGHT/2 + ChandraR + 55` | 1610 |
| `ChandraY` (landscape) | `EOSCREENWIDTH/2 - EOSTATICSTATUSBARHEIGHT - ChandraR - 55 + EOSTATICSTATUSBARHEIGHT` | 1611 |
| `bdY2` (landscape) | `-EOSCREENWIDTH/2 + dateH/2` | 1613 |
| `bdX` (landscape) | `-bdX2` | 1614 |
| `bdY` (landscape) | `bdY2` | 1615 |
| `bdX3` (landscape) | `bdX` | 1616 |
| `bdY3` (landscape) | `bdY + 24 + 10.5` | 1617 |
| `bdX4` (landscape) | `bdX + 65` | 1618 |
| `fDSTX` (landscape) | `mainX - 127` | 1621 |
| `fDSTY` (landscape) | `mainY - 306` | 1622 |
| `sDSTX` (landscape) | `mainX - 200` | 1623 |
| `sDSTY` (landscape) | `mainY - 262` | 1624 |
| `altX` (landscape) | `mainX - extDialOffX` | 1625 |
| `altY` (landscape) | `mainY + extDialOffY` | 1626 |
| `azX` (landscape) | `mainX - extDialOffX` | 1627 |
| `azY` (landscape) | `mainY - extDialOffY * 3.5` | 1628 |
| `EOTX` (landscape) | `mainX + extDialOffX` | 1629 |
| `EOTY` (landscape) | `mainY - extDialOffY * 3.5` | 1630 |
| `eclipseX` (landscape) | `mainX + extDialOffX` | 1631 |
| `eclipseY` (landscape) | `mainY + extDialOffY` | 1632 |
| `resetY` (landscape) | `EOSCREENWIDTH/2 - EOSTATICSTATUSBARHEIGHT - 17` | 1634 |
| `EVX` | `BMX + centerX` | 1636 |
| `EVY` | `BMY + centerY` | 1637 |
| `tickHeight` | `mainFontSize / 2.5` | 1650 |
| `plR` | `mainR - mainFontSize - 1` | 1651 |
| `subOffset` | 149 (literal); comment: `// == earth Radius; approximately (plR - sunRingWidth)/4` | 1655 |
| `subR` | `(orbitInc - 1) * 2 - 5` | 1656 |
| `zR` | `plR - 60` | 1674 |
| `plR2` | `plR - 52 - 26` | 1675 |
| `h24Len` | `mainR - tickHeight * 0.37` | 1677 |
| `h24Wid` | `h24Arrow / 1.8 / sqrt(3)` | 1678 |
| `minLen` | `zR - zodiacFontSize / 2` | 1679 |
| `h12Len` | `minLen * 0.75` | 1680 |
| `secLen` | `minLen * 1.05` | 1681 |
| `sunRiseSetLen` | `h24Len` (code); comment: `//plR + 52 - sunRingWidth;` | 1682 |
| `alarmLen` | `mainR + alarmTailR*2 + 1` | 1686 |
| `alarmLen2` | `mainR + alarmTailR*2 + 1` | 1687 |
| `len2` | `zR - 5` | 1690 |
| `altR` | `extDialR` | 1708 |
| `azR` | `altR` | 1709 |
| `eclipseR2` | `altR + 3` | 1710 |
| `eclipseR1` | `eclipseR2 - 14` | 1711 |
| `demoButtonOffsetY` | `eclipseR2 + 15` | 1712 |
| `EOTR` | `altR` | 1713 |
| `UTCX` | `mainX` | 1660 |
| `UTCY` | `mainY + subOffset * ringMasterScale` | 1661 |
| `utcdayX` | `mainX` | 1662 |
| `utcdayY` | `UTCY - 39` | 1663 |
| `solarX` | `mainX - subOffset * ringMasterScale * cos(pi/6)` | 1664 |
| `solarY` | `mainY - subOffset * ringMasterScale * sin(pi/6)` | 1665 |
| `sidX` | `-solarX` | 1666 |
| `sidY` | `solarY` | 1667 |
| `eclipseStatusX` | `eclipseX` | 1669 |
| `eclipseStatusY` | `eclipseY` | 1670 |
| `eclipseHorizonX` | `eclipseX` | 1671 |
| `eclipseHorizonY` | `eclipseY` | 1672 |

## 7. Asymmetries & Ambiguities Worth a Human Look

### 7a. `azY` and `EOTY` landscape use `extDialOffY * 3.5` instead of `extDialOffY * 1`

In portrait, the four external dial Y-positions are computed symmetrically:

```
altY  = mainY + extDialOffY      // +extDialOffY
azY   = mainY - extDialOffY      // -extDialOffY
EOTY  = mainY - extDialOffY      // -extDialOffY
eclipseY = mainY + extDialOffY   // +extDialOffY
```

In landscape, `azY` and `EOTY` switch to `* 3.5`:

```
altY  = mainY + extDialOffY         // +extDialOffY
azY   = mainY - extDialOffY * 3.5   // ⚠ *3.5 instead of *1
EOTY  = mainY - extDialOffY * 3.5   // ⚠ *3.5 instead of *1
eclipseY = mainY + extDialOffY      // +extDialOffY
```

This appears intentional (pushing the azimuth and EOT dials further from centre in landscape) but is unexplained.

### 7b. `bdX4` uses different offsets per orientation

Portrait: `bdX4 = bdX + 90`
Landscape: `bdX4 = bdX + 65`

The +90/+65 hardcoded constants have no comment explaining the difference.

### 7c. `bdX2` and `bdX` are symmetric in portrait, asymmetric in landscape

Portrait: `bdX2` = `bdX` (both computed from the same formula). They are the same point.
Landscape: `bdX2` = -333 (hardcoded), `bdX` = `-bdX2` = 333 (mirrored). This is a symmetric pair with an unexplained magic number -333.

### 7d. `bdY2` vs `bdY` derivation differs between orientations

Portrait: `bdY` and `bdY2` are computed from `BMY` with symmetric ± offsets: `BMY ± headerHeight/4 ∓ headerLineWidth`.
Landscape: `bdY2` is computed from `EOSCREENWIDTH` and `dateH`; `bdY` is then set equal to `bdY2`.

### 7e. `bdY3` landscape adds `24 + 10.5`

The expression `24 + 10.5 = 34.5` is inline arithmetic rather than a single symbolic constant. No comment explains these numbers.

### 7f. `ChandraY` landscape contains self-cancelling `-EOSTATICSTATUSBARHEIGHT + EOSTATICSTATUSBARHEIGHT`

Line 1611: `EOSCREENWIDTH/2 - EOSTATICSTATUSBARHEIGHT - ChandraR - 55 + EOSTATICSTATUSBARHEIGHT`
Simplifies to `384 - 20 - 75 - 55 + 20` = `384 - 75 - 55`. The ±20 cancel. Possibly a vestige of an earlier formula.

### 7g. `mainX` landscape comment

Line 1597: `mainX = 0; // use "-(headerHeight + headerLineWidth*2) / 2" for same position relative to Home button`
The comment suggests an alternate value was considered but the assigned value is `0`.

### 7h. `logoY` landscape commented-out expression

Line 1606: `//logoY = -EOSCREENWIDTH/2 + logoH + 5;`
Active line 1607: `logoY = -(EOSCREENWIDTH-EOSTATICSTATUSBARHEIGHT-19)/2 + 2;`
The commented-out formula uses `logoH` (= 29) while the active one uses `EOSTATICSTATUSBARHEIGHT` (= 20) and a different structure.

### 7i. `sunRiseSetLen` commented-out alternate

Line 1682: `sunRiseSetLen = h24Len; //plR + 52 - sunRingWidth;`
The active value tracks `h24Len` (= 360.264). The commented formula would evaluate differently: `plR + 52 - sunRingWidth` = `332 + 52 - 64` = 320.

### 7j. `subOffset` comment

Line 1655: `subOffset = 149;  // == earth Radius; approximately (plR - sunRingWidth)/4`
The approximate expression evaluates to `(332 - 64)/4 = 67` — not 149. The comment "== earth Radius" suggests this literal 149 is tied to the Earth subdial size rather than the algebraic expression.
