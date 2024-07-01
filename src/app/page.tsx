// pages/index.tsx
import GameBoard from "@/components/GameBoard";

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center">
      <GameBoard />
    </div>
  );
};

export default Home;
