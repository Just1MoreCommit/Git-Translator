require('./style.css');

console.log('Gitly app loaded');

// Typewriter effect for AI-generated text
document.addEventListener('DOMContentLoaded', () => {
  const typewriterElements = document.querySelectorAll('.typewriter-text');

  typewriterElements.forEach(el => {
    const text = el.textContent;
    el.textContent = '';
    el.style.overflow = 'hidden';
    el.style.whiteSpace = 'nowrap';
    el.style.display = 'inline-block';

    let i = 0;
    const speed = 25; // ms per character

    function type() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        // Add blinking cursor after typing is done
        el.classList.add('cursor-blink');
      }
    }

    // Start typing after a short delay
    setTimeout(type, 500);
  });

  // Add staggered animation delays to log entries if any exist
  const logEntries = document.querySelectorAll('.log-entry');
  logEntries.forEach((entry, index) => {
    entry.style.animationDelay = `${index * 0.1}s`;
  });

  // Sidebar button active state management
  const sidebarButtons = document.querySelectorAll('#left-btns button');
  sidebarButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sidebarButtons.forEach(b => {
        b.classList.remove('sidebar-active');
        b.classList.remove('bg-surface');
        b.classList.remove('text-white');
        b.classList.add('bg-transparent');
        b.classList.add('text-gray-400');
      });
      btn.classList.add('sidebar-active');
      btn.classList.add('bg-surface');
      btn.classList.add('text-white');
      btn.classList.remove('bg-transparent');
      btn.classList.remove('text-gray-400');
    });
  });
});



// github api call

document.getElementById('decode').addEventListener('click', async ()=>{
  const repoURL = document.getElementById("url-input").value;

  const replacedURL = repoURL.replace("https://github.com/", "");
  const [owner, repo]  = replacedURL.split("/");
  const cleanRepo = repo.replace(".git", "");

  console.log(owner + repo);

  const response = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/commits`);
  const data = await response.json();

  console.log(data);

  console.log(data[0].commit.message)
  console.log(data[0].commit.author.name)
  console.log(data[0].sha)

});
