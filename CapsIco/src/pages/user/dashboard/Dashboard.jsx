import {HeaderInfoBar} from '/src/Components/tempuser/HeaderInfoBar/HeaderInfoBar';
import {NavBar} from '/src/Components/tempuser/NavBar/NavBar';
import {Hero} from '/src/Components/tempuser/dashboard/Hero/Hero';
import {BookingCard} from '/src/Components/tempuser/dashboard/BookingCard/BookingCard';

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
