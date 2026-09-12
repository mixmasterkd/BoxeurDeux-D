
## competition

Use case: identity-preserve. Reference: existing blue boxer viewed FROM BEHIND. Create his COMPETITION uniform animation atlas, preserving warm skin, athletic body, short dark hair, same back-view camera, polished 16-bit SNES sprite craft and classic orthodox boxing stance (left hand viewer LEFT, right hand viewer RIGHT). The uniform must be ROYAL BLUE singlet and ROYAL BLUE shorts, WHITE clear contrasting elastic waistband, simple white piping, BLUE gloves with WHITE cuffs, BLUE open face competition helmet covering ears/back ONLY, no cheek protectors/no nosebar (face remains away from viewer), blue boots white laces. NO yellow, no logos, no text.
ONE atlas with 4 columns by 4 rows, 16 separated full-body sprites, image2048 square, invisible512-square cells. Same physical size, feet on consistent cellbottom baseline, centered stance, full gloves boots insidecell, spacious gutters, genuinely transparent alpha background, no castshadow/grid.
Row1 left to right: neutral guard back toward viewer bothglovesraised; high block headshield; LEFT jab preparation half-extension viewerLEFT; LEFT jab full forward extension upward-left hitting frontal opponent face.
Row2: RIGHT straight preparation rightshoulderback; RIGHT straight full forward extension upward-right; LEFT hook windup torso turns LEFT gloveheldwide; LEFT hook full forward curved contact leftelbowraised arm acrosscenter.
Row3: crouching LEFT jab body preparation; crouching LEFT jab body contact forearm angled lowforward; crouching RIGHT straight body preparation; crouching RIGHT straight body contact.
Row4: crouching LEFT hook body preparation; crouching LEFT hook body contact horizontal bentarm; low body block elbows protect abdomen gloveslow; body hit reaction bentwaist clutchingabdomen.
All views FROM BEHIND, no front views. Preserve muscular human anatomy and same stance physical scale. Key contact poses clearly differ from guard/windup. Pixel art precise shading like reference. Actual transparent PNG required, no painted checkerboard.

## competitionRecovery

Use case: identity-preserve. Production sprite atlas. Input1 is the uniform and identity reference, input2 is a seated pose reference only (do not copy yellow).
Create exactly SIX full-body poses of the SAME player viewed FROM BEHIND, orthodox boxing stance, warm skin short dark hair, ROYAL BLUE competition singlet and shorts, WHITE contrasting waist band and piping, BLUE open-face headguard, BLUE gloves WHITE cuffs, blue boots white details. Never yellow. Detailed clean 16-bit SNES pixel art consistent with input1.
Wide image 1980x800; 6 equally spaced invisible cells in ONE horizontal row, original standing scale retained in seated/kneeling poses. All soles/ground at same baseline nearbottom. Keep spacious transparent gutters and ALL arms/boots inside eachcell, no grid/text/label/background/shadow. REAL transparent RGBA.
Left to right: 1 standing backview guard, bothglovesathead; 2 backview headhit reaction torsoleanedsideways headrecoils; 3 backview dodging left, headandtorsoleft whilefeetplantedsamewidth; 4 falling to leftknee rightlegbent, back towardviewer; 5 sitting oncanvas buttonground kneesbent, backtowardviewer like secondreference; 6 gettingup fromone knee, onegloveonthigh andonehandatguard, halfwaybetweenkneelingandstanding.
Same anatomy/characterphysicalscale acrossallposes. Actual standingposeheightabout680px, knees/seatedheightnaturallyshorter.

## competitionRecoveryAlpha

Use case: background-extraction. Edit target: the supplied blue competition player recovery atlas. Preserve EVERY colored sprite pixel, pose, scale, arrangement, identity and uniform. Remove ONLY the gray-and-white checkerboard background, including holes between limbs, and return a PNG with REAL alpha transparency. This is production sprite extraction, the checkerboard must not be drawn into the PNG; its alpha must be zero. Do not change/crop/rearrange characters, no shadows, no new background. Also remove the tiny decorative yellow impact mark floating next to the second sprite; game impacts are drawn separately.

## gagnon-jab

Use case: identity-preserve. Input1 is Gagnon identity/uniform, input2 is the EXACT LEFT JAB pose to imitate. Generate one complete FULL BODY FRONT VIEW sprite of Gagnon in red and white competition uniform throwing the anatomical LEFT JAB at full contact. His LEFT shoulder and extended forearm are on the VIEWER RIGHT, same as input2; his RIGHT glove stays at his VIEWER LEFT cheek. Do not cross the right arm across the face. Preserve Gagnon's mediumbrown skin buzzcut cleanface bodybuild redopenfaceheadguard redsinglet redshorts whitewaist redgloves whitecuffs blackboots. Match the precise sprite shading of input1. Wholecharacter pixelart with realtransparentalpha, no other pose no background no text no castshadow.

## gagnon-jabAlpha

Use case: background-extraction. Preserve the supplied single boxing sprite EXACTLY, all anatomy pose colors outline costume boots. Remove ONLY gray and white checkerboard backdrop, including holes between limbs. Return true RGBA transparent PNG, absolutely no drawn checkerboard, no new background or shadows. Do not redraw or crop the sprite.

## competition-hook

Use case: precise-object-edit. Edit this one original back-view player LEFT HOOK contact sprite. Preserve EXACT anatomy pose perspective foot anchor extended left forearm and highgloveposition. Change ONLY yellow uniform trim/waistband to WHITE, white gloves to ROYAL BLUE with white cuffs. Restofuniform staysroyalblue with white piping, helmetbluewhite earscovered openfacecompetition. Nootherpose nochangeinidentity no background shadow text. RealtransparentPNG, whole sprite.

## competition-hook-body

Use case: precise-object-edit. Edit this one original back-view player LEFT BODY HOOK contact sprite. Preserve EXACT anatomy pose perspective foot anchor leftelbow extended forearm and visibleleftgloveposition. Change ONLY yellow uniform trim/waistband to WHITE, white gloves to ROYAL BLUE with white cuffs. Restofuniform staysroyalblue with white piping, helmetbluewhite earscovered openfacecompetition. Nootherpose nochangeinidentity no background shadow text. RealtransparentPNG, whole sprite.

## competition-hook-bodyAlpha2
