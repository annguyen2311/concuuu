const User = require('./models/User');

(async () => {
  console.log('=== Test Start ===');
  console.log('User.find type:', typeof User.find);
  
  try {
    const result = await User.find();
    console.log('Result type:', typeof result);
    console.log('Result constructor:', result.constructor.name);
    console.log('Has sort:', typeof result.sort);
    
    if (result.sort) {
      const sorted = result.sort({ reputation: -1 });
      console.log('After sort type:', typeof sorted);
      console.log('Has limit:', typeof sorted.limit);
      
      if (sorted.limit) {
        const limited = sorted.limit(5);
        console.log('Final result:', limited);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
