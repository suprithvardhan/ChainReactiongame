import dynamic from 'next/dynamic';

const GameBoard = dynamic(() => import('@/components/GameBoard'), {
  ssr: false,
});

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center">
      <GameBoard />
    </div>
  );
};

export default Home;