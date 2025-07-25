import {HeaderInfoBar} from '@/Components/user/headerInfoBar/HeaderInfoBar';
import {NavBar} from '@/Components/user/navBar/NavBar';
import {ContactInfoGrid} from '@/Components/user/contact/contactInfoGrid/ContactInfoGrid';
import {Footer} from '@/Components/user/footer/Footer';

export function Contact() {
  return (
    <>
      <HeaderInfoBar />
      <NavBar />
      <ContactInfoGrid />
      <Footer />
    </>
  );
}
