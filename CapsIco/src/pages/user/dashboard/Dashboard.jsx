import {HeaderInfoBar} from '/src/components/user/HeaderInfoBar/HeaderInfoBar';
import {NavBar} from '/src/components/user/NavBar/NavBar';
import {Hero} from '/src/components/user/dashboard/Hero/Hero';
import {BookingCard} from '/src/components/user/dashboard/BookingCard/BookingCard';
import {Footer} from '@/Components/user/footer/Footer';


export function Dashboard() {
  return (
    <>
    
      <HeaderInfoBar />
      <NavBar />
      <Hero />
      <BookingCard />
      <Footer />
      
    </>
  );
}
