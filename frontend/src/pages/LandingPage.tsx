import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLenis } from '../hooks/useLenis';
import { HeroSection } from '../components/landing/HeroSection';
import { TunnelGrid } from '../components/landing/TunnelGrid';
import { RoomContainer } from '../components/landing/RoomContainer';
import { LandingCTA } from '../components/landing/LandingCTA';
import { ForumRoom } from '../components/landing/ForumRoom';
import { LinksRoom } from '../components/landing/LinksRoom';
import { EventsRoom } from '../components/landing/EventsRoom';
import { CasinoRoom } from '../components/landing/CasinoRoom';
import { MinecraftRoom } from '../components/landing/MinecraftRoom';

const ROOMS = [
  {
    id: 'room-forum',
    color: '#00E5FF',
    flyingText: 'FORUM',
    description: 'Der Raum für zivilisierte Diskussionen.',
    to: '/forum',
    requiresAuth: true,
    requiresRole: null as string[] | null,
    Component: ForumRoom,
  },
  {
    id: 'room-links',
    color: '#A855F7',
    flyingText: 'LINKS',
    description: 'Alle wichtigen Online-Links für die Schule.',
    to: '/links',
    requiresAuth: false,
    requiresRole: null,
    Component: LinksRoom,
  },
  {
    id: 'room-events',
    color: '#FF6B35',
    flyingText: 'ABI 27',
    description: 'Plane die besten Events deines Lebens.',
    to: '/events',
    requiresAuth: true,
    requiresRole: null,
    Component: EventsRoom,
  },
  {
    id: 'room-games',
    color: '#FF2D55',
    flyingText: 'Hast du Glück heute?',
    description: undefined,
    to: '/games',
    requiresAuth: true,
    requiresRole: null,
    Component: CasinoRoom,
  },
  {
    id: 'room-minecraft',
    color: '#00FF94',
    flyingText: 'ESSENSGRUPPE SERVER',
    description: undefined,
    to: '/mc',
    requiresAuth: true,
    requiresRole: ['ESSENSGRUPPE_MITGLIED', 'ADMIN'],
    Component: MinecraftRoom,
  },
];

export const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Initialize smooth scroll
  useLenis();

  const handleRoomClick = (room: typeof ROOMS[number]) => {
    // Check role requirement
    if (room.requiresRole && (!user || !room.requiresRole.includes(user.role))) {
      if (!isAuthenticated) navigate('/login');
      return;
    }
    // Check auth requirement
    if (room.requiresAuth && !isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate(room.to);
  };

  // Filter rooms by role visibility (MC only for members)
  const visibleRooms = ROOMS.filter((room) => {
    if (!room.requiresRole) return true;
    if (!isAuthenticated || !user) return true; // Show room but click won't navigate
    return room.requiresRole.includes(user.role);
  });

  return (
    <div className="bg-gray-950 overflow-x-hidden">
      {/* Persistent tunnel grid — always in background, moves with scroll */}
      <TunnelGrid />

      {/* Hero: video + ABI 27 + zoom out */}
      <HeroSection />

      {/* Spacer: hallway entrance after hero */}
      <div className="h-[25vh]" />

      {/* Rooms */}
      {visibleRooms.map((room) => (
        <RoomContainer
          key={room.id}
          id={room.id}
          color={room.color}
          flyingText={room.flyingText}
          description={room.description}
          onClick={() => handleRoomClick(room)}
        >
          <room.Component />
        </RoomContainer>
      ))}

      {/* Final CTA */}
      <LandingCTA />
    </div>
  );
};
