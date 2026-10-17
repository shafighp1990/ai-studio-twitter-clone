import {redirect} from 'next/navigation';
import {getViewer} from '@/lib/data';
import {all} from '@/lib/cloudflare/db';
import MeetingsDashboard,{type RoomListItem} from '@/components/MeetingsDashboard';
export default async function Page(){const viewer=await getViewer();if(!viewer)redirect('/login');const rooms=await all<RoomListItem>('SELECT id,title,ended,created_at FROM rooms WHERE host_id=? ORDER BY created_at DESC LIMIT 30',viewer.id);return <MeetingsDashboard initialRooms={rooms}/>;}
