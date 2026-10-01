# Smart All In One Tool

A mobile-first image/PDF utility web app inspired by the supplied reference screenshots.

## Included UI
- Exact target-size image compression buttons from 5KB to 2MB
- Image/PDF tool collection
- Format conversion collection
- Passport & ID photo collection
- 3D glass/neumorphic dark UI
- Responsive phone layout
- Browser-side processing where practical

## Working modules in this starter
- Image compression to target KB
- Image format conversion (browser-supported formats)
- Image to PDF
- PDF to JPG
- JPG/PNG OCR to text
- Basic passport/ID canvas sizing

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## GitHub / Phone workflow
1. Upload this project to your GitHub repository.
2. Open it in a browser-based development environment.
3. Run `npm install`.
4. Run `npm run build`.
5. Deploy the generated `dist` folder to your preferred static host.

## Notes
- Exact KB compression is iterative and may reduce dimensions if quality alone cannot meet the target.
- HEIC/AVIF decoding depends on browser support; dedicated decoders can be added later.
- Some listed tools are UI-ready but need specialized processing modules for production-grade edge cases.

## Premium UI upgrade
- 3D animated highlights and floating hero orb
- Light/dark toggle
- Tool search bar
- Enhanced glass/neumorphic effects
