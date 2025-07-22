import HeaderInfoBar from '/src/Components/common/HeaderInfoBar/HeaderInfoBar';
import NavBar from '/src/Components/common/NavBar/NavBar';
import Hero from '/src/Components/dashboard/Hero/Hero';
import BookingCard from '/src/Components/dashboard/BookingCard/BookingCard';

export default function Dashboard() {
  return (
    <>
      <HeaderInfoBar />
      <NavBar />
      <Hero />
      <BookingCard />
    </>
  );
}
