export default {
  items: [
    {
      name: "Dashboard",
      url: "/dashboard",
      icon: "icon-speedometer"
    },
    {
      title: true,
      name: "Statistics",
      wrapper: {
        // optional wrapper object
        element: "", // required valid HTML5 element tag
        attributes: {} // optional valid JS object with JS API naming ex: { className: "my-class", style: { fontFamily: "Verdana" }, id: "my-id"}
      },
      class: "" // optional class names space delimited list for title item ex: "text-center"
    },
    {
      name: "Users",
      url: "/users",
      icon: "icon-user"
    },
    {
      name: "Posts",
      url: "/posts",
      icon: "icon-speech"
    },
    {
      name: "Category",
      url: "/category",
      icon: "icon-book-open"
    },
    {
      name: "Subcategory",
      url: "/subcategory",
      icon: "icon-book-open"
    },
    {
      name: "Keywords",
      url: "/keywords",
      icon: "icon-tag"
    },
    {
      name: "Sound",
      url: "/sound",
      icon: "icon-control-forward",
      children: [
        {
          name: "Category",
          url: "/sound/category",
          icon: "icon-grid"
        },
        {
          name: "Sounds",
          url: "/sound/sound",
          icon: "icon-volume-1"
        }
      ]
    },
    {
      name: "Support",
      url: "/base",
      icon: "icon-puzzle",
      children: [
        {
          name: "Feedback",
          url: "/support/feedbacks",
          icon: "icon-puzzle"
        },
        {
          name: "Reported Problems",
          url: "/support/reported-problems",
          icon: "icon-puzzle"
        },
        {
          name: "App Versions",
          url: "/support/app-versions",
          icon: "icon-puzzle"
        },
        {
          name: "Bulk Upload",
          url: "/support/bulk-upload",
          icon: "icon-puzzle"
        }
      ]
    },
    {
      name: "Admin Users",
      url: "/admin-users",
      icon: "icon-user"
    }

  ]
};
