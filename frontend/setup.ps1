# Run this script from e:\E-Shop\frontend to scaffold the Next.js app
# Step 1: Create Next.js app
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git

# Step 2: Install runtime dependencies
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-toast @radix-ui/react-tabs @radix-ui/react-accordion @radix-ui/react-separator lucide-react zustand axios next-auth@beta clsx tailwind-merge class-variance-authority @radix-ui/react-slot react-hot-toast react-image-gallery swiper

# Step 3: Install dev dependencies
npm install -D @types/node

Write-Host "Setup complete! All dependencies installed." -ForegroundColor Green
