import MemberSubmissions from '@/components/MemberSubmissions';

export default function AdminViewSubmissions() {
    return <MemberSubmissions apiBase="/api/admin/users" />;
}
