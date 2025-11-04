# Lego Catalog Font Options

## Current Setup (Automatic - No Action Needed!)

The app currently uses **Bungee** from Google Fonts, which gives a bold, blocky, Lego-like appearance. This works automatically with no setup required!

## Optional: Use the Actual Lego Blocks Font

If you want to use the actual "Lego Blocks" font instead, follow these steps:

## Download the Font

1. Go to: https://www.fontspace.com/lego-blocks-font-f83398
2. Click the "Download" button
3. Extract the downloaded ZIP file

## Install the Font Files

Copy the font files to this directory (`frontend/public/fonts/`):

- If you have a `.ttf` file, rename it to `LegoBlocks.ttf` and place it here
- If you have `.woff` or `.woff2` files, place them here as well

**Expected files in this directory:**
```
frontend/public/fonts/
├── LegoBlocks.ttf      (required)
├── LegoBlocks.woff     (optional, for better browser support)
└── LegoBlocks.woff2    (optional, for better browser support)
```

## After Adding the Font Files

1. **Uncomment the @font-face declaration** in `frontend/src/index.css` (lines 9-19)
2. **Update the font family** in `frontend/src/components/Layout.tsx`:
   Change from: `fontFamily: "'Bungee', sans-serif"`
   To: `fontFamily: "'Lego Blocks', sans-serif"`
3. Restart the frontend server if it's running
4. Refresh your browser (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
5. The "Lego Catalog" title should now appear in the Lego Blocks font!

## License Note

The Lego Blocks font on FontSpace is typically free for personal use. Please check the license terms on the download page to ensure you're using it appropriately.

## Troubleshooting

**Font not showing up?**
- Make sure the font file is named exactly `LegoBlocks.ttf` (case-sensitive)
- Check that it's in the correct directory: `frontend/public/fonts/`
- Try a hard refresh in your browser (Ctrl+Shift+R)
- Check browser console for any font loading errors

**Can't find a .ttf file?**
- Some font downloads only include .otf files
- If you have `LegoBlocks.otf`, you can rename it to `LegoBlocks.ttf`
- Or use an online converter to convert .otf to .ttf

## Alternative Fonts

If you can't get the Lego Blocks font, here are some similar blocky fonts that work well:
- **Staatliches** (Google Fonts) - Bold, industrial look
- **Righteous** (Google Fonts) - Curved, playful blocks
- **Fredoka One** (Google Fonts) - Rounded, friendly blocks

To use a Google Font instead, update `frontend/src/index.css` and replace the @font-face with a Google Fonts import.
