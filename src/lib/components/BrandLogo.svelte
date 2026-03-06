<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let className: string = '';
  
  const sizes = {
    sm: 'h-12',
    md: 'h-16',
    lg: 'h-30 md:h-34 lg:h-38'
  };
</script>

<div class={`flex items-center ${className}`}>
  <svg
    viewBox="0 0 1200 300"
    xmlns="http://www.w3.org/2000/svg"
    class={`${sizes[size]} w-auto`}
    role="img"
    aria-label="Cruz Crewz Professional Lawn Maintenance"
  >
    <text
      x="600"
      y="165"
      text-anchor="middle"
      font-family="Arial Rounded MT Bold, Montserrat, sans-serif"
      font-size="140"
      font-weight="800"
      fill="#1f7a3f"
      letter-spacing="2"
    >
      CRUZ CREWZ
    </text>
    
    <text
      x="600"
      y="230"
      text-anchor="middle"
      font-family="Montserrat, Arial, sans-serif"
      font-size="60"
      fill="#6f6f6f"
      letter-spacing="1"
    >
      Professional Lawn Maintenance
    </text>
  </svg>
</div>