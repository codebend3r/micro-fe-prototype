import { Link } from 'wouter';

/** Route 1 of 3. */
export function Home() {
  return (
    <>
      <div className="note">
        <strong>Aw geez, this is morty's home page</strong>
        <span>
          Morty has three pages and world knows about none of them. It matched{' '}
          <span className="mono">/morty</span>, mounted this app once, and handed the rest of the
          URL over. The two links below are morty's own wouter pushing history entries under that
          prefix.
        </span>
      </div>

      <div className="row">
        <Link href="/school" className="btn btn-sm btn-primary">
          Go to School
        </Link>
        <Link href="/inventory" className="btn btn-sm">
          Check the Inventory
        </Link>
      </div>
    </>
  );
}
