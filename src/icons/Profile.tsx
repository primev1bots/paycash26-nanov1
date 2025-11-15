import { IconProps } from "../utils/types";

const Profile: React.FC<IconProps> = ({ size = 24, className = "" }) => {
  const svgSize = `${size}px`;

  return (
    <svg
      className={className}
      width={svgSize}
      height={svgSize}
      viewBox="0 0 40 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head */}
      <circle cx="20" cy="10" r="6" fill="currentColor" />
      {/* Shoulders / Body */}
      <path
        d="M6 26c0-2.5 1.6-4.9 4.2-6.4C12.8 18.9 16.3 18 20 18s7.2.9 9.8 1.6C32.4 21.1 34 23.5 34 26v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-1z"
        fill="currentColor"
      />
    </svg>
  );
};

export default Profile;
