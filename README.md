# Culinara 🍳

A beautiful recipe sharing and meal planning application built with React Native and Expo.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Culinara
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start --tunnel
```

## 📁 Project Structure

```
app/
├── (tabs)/          # Main tab navigation screens
│   ├── explore.tsx  # Recipe exploration
│   ├── profile.tsx  # User profile
│   └── friends.tsx   # Friends management
├── profile_tabs/    # Profile sub-screens
│   ├── myRecipes.tsx
│   ├── mealPlan.tsx
│   ├── likedRecipes.tsx
│   └── groceryList.tsx
├── user/            # User profile views
└── friends/         # Friends list screens
```

## 🌿 Git Workflow

### Branches

- `main` - Production branch
- `pat` - Patrick's development branch
- `nat` - Nat's development branch
- `ilani` - Ilani's development branch
- `vivians` - Vivian's development branch

### Common Commands

#### Pull latest changes:
```bash
git pull
```

#### Stage all changes:
```bash
git add .
```

#### Commit changes:
```bash
git commit -m "Your commit message"
```

#### Push to remote:
```bash
git push origin <branch>
```

### Creating a Pull Request

1. Make sure you're on your feature branch:
```bash
git checkout pat  # or your branch name
```

2. Pull latest changes from main:
```bash
git pull origin main
```

3. Make your changes and commit:
```bash
git add .
git commit -m "Description of your changes"
git push origin pat  # or your branch name
```

4. Create a PR on GitHub/GitLab:
   - Go to the repository
   - Click "New Pull Request"
   - Select your branch → `main`
   - Add description and submit

## 🛠️ Development

### Running the App

```bash
npx expo start --tunnel
```

Scan the QR code with:
- **iOS**: Camera app
- **Android**: Expo Go app

### Key Features

- 🔍 Explore public recipes
- 👤 User profiles with recipes
- 👥 Friends system
- 📝 Meal planning
- 🛒 Grocery list with budget tracking
- ❤️ Like and save recipes

## 📦 Tech Stack

- React Native
- Expo
- TypeScript
- Supabase (Backend)
- React Navigation

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Commit with clear messages
4. Push and create a PR

