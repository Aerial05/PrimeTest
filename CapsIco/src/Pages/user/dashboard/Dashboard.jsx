import {HeaderInfoBar} from '/src/Components/tempuser/HeaderInfoBar/HeaderInfoBar';
import {NavBar} from '/src/Components/tempuser/NavBar/NavBar';
import {Hero} from '/src/Components/dashboard/Hero/Hero';
import {BookingCard} from '/src/Components/dashboard/BookingCard/BookingCard';

export function Dashboard() {
  return (
    <>
      <HeaderInfoBar />
      <NavBar />
      <Hero />
      <BookingCard />
    </>
  );
}
