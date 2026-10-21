import { redirect } from 'next/navigation';

// Accounts are created with Google from the sign-in page
export default function RegisterPage() {
    redirect('/login');
}
